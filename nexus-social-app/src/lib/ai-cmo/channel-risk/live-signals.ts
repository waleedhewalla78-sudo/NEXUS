/**
 * CLOSED: S15-004-002 — 24h publish rejection signals for channel-risk heatmap.
 * Prefers campaign_publish_attempts; falls back to posts (status=failed + publish_error).
 */

import { supabaseAdmin } from '@/lib/supabase/server';
import { normalizeChannelKey } from '@/lib/ai-cmo/channel-risk/ruleset';

export type ChannelLiveSignals = {
  rejectionRate24h: number;
  lastRejectionReason: string | null;
};

type AttemptRow = {
  channel?: string | null;
  platform?: string | null;
  status?: string | null;
  failure_reason?: string | null;
  error_message?: string | null;
  created_at?: string | null;
};

type PostRow = {
  platforms?: string[] | null;
  status?: string | null;
  publish_error?: string | null;
  updated_at?: string | null;
};

function isMissingTableError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? '').toLowerCase();
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    msg.includes('does not exist') ||
    msg.includes('could not find the table')
  );
}

function channelFromAttempt(row: AttemptRow): string {
  return normalizeChannelKey(row.channel ?? row.platform ?? 'unknown');
}

function reasonFromAttempt(row: AttemptRow): string | null {
  return row.failure_reason ?? row.error_message ?? null;
}

function aggregateAttempts(rows: AttemptRow[]): Map<string, ChannelLiveSignals> {
  const stats = new Map<
    string,
    { failures: number; attempts: number; lastReason: string | null; lastAt: string | null }
  >();

  for (const row of rows) {
    const channel = channelFromAttempt(row);
    const status = (row.status ?? '').toLowerCase();
    const isFailure = status === 'failed' || status === 'rejected' || status === 'error';
    const isSuccess = status === 'published' || status === 'success' || status === 'succeeded';
    if (!isFailure && !isSuccess) continue;

    const entry = stats.get(channel) ?? {
      failures: 0,
      attempts: 0,
      lastReason: null,
      lastAt: null,
    };
    entry.attempts += 1;
    if (isFailure) {
      entry.failures += 1;
      const reason = reasonFromAttempt(row);
      const at = row.created_at ?? null;
      if (reason && (!entry.lastAt || (at && at > entry.lastAt))) {
        entry.lastReason = reason;
        entry.lastAt = at;
      }
    }
    stats.set(channel, entry);
  }

  return toLiveSignalsMap(stats);
}

function aggregatePosts(rows: PostRow[]): Map<string, ChannelLiveSignals> {
  const stats = new Map<
    string,
    { failures: number; attempts: number; lastReason: string | null; lastAt: string | null }
  >();

  for (const row of rows) {
    const platforms = row.platforms ?? [];
    const status = (row.status ?? '').toLowerCase();
    const isFailure = status === 'failed';
    const isSuccess = status === 'published';
    if (!isFailure && !isSuccess) continue;

    for (const platform of platforms) {
      const channel = normalizeChannelKey(platform);
      const entry = stats.get(channel) ?? {
        failures: 0,
        attempts: 0,
        lastReason: null,
        lastAt: null,
      };
      entry.attempts += 1;
      if (isFailure) {
        entry.failures += 1;
        const reason = row.publish_error ?? null;
        const at = row.updated_at ?? null;
        if (reason && (!entry.lastAt || (at && at > entry.lastAt))) {
          entry.lastReason = reason;
          entry.lastAt = at;
        }
      }
      stats.set(channel, entry);
    }
  }

  return toLiveSignalsMap(stats);
}

function toLiveSignalsMap(
  stats: Map<
    string,
    { failures: number; attempts: number; lastReason: string | null; lastAt: string | null }
  >,
): Map<string, ChannelLiveSignals> {
  const out = new Map<string, ChannelLiveSignals>();
  for (const [channel, entry] of stats) {
    out.set(channel, {
      rejectionRate24h:
        entry.attempts > 0 ? Math.round((entry.failures / entry.attempts) * 1000) / 1000 : 0,
      lastRejectionReason: entry.lastReason,
    });
  }
  return out;
}

/**
 * Returns per-channel live signals, or null when no failure table is available.
 */
export async function fetchLiveSignalsByChannel(
  workspaceId: string,
): Promise<Map<string, ChannelLiveSignals> | null> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const probe = await supabaseAdmin.from('campaign_publish_attempts').select('id').limit(1);
  if (!probe.error) {
    const { data, error } = await supabaseAdmin
      .from('campaign_publish_attempts')
      .select('channel, platform, status, failure_reason, error_message, created_at')
      .eq('workspace_id', workspaceId)
      .gte('created_at', since);

    if (error) return null;
    return aggregateAttempts((data ?? []) as AttemptRow[]);
  }

  if (!isMissingTableError(probe.error)) {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from('posts')
    .select('platforms, status, publish_error, updated_at')
    .eq('workspace_id', workspaceId)
    .gte('updated_at', since)
    .in('status', ['failed', 'published']);

  if (error) return null;
  return aggregatePosts((data ?? []) as PostRow[]);
}
