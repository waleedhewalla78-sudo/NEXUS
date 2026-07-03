/**
 * Feature 004 Sprint 15 — Channel risk aggregation (read-only).
 * CLOSED: S15-004-002 — per-platform TOS heatmap scores + evaluation enrichment.
 */

import { supabaseAdmin } from '@/lib/supabase/server';
import {
  CHANNEL_RISK_RULESET,
  computeChannelScore,
  findChannelRule,
  normalizeChannelKey,
  scoreToRiskTier,
  type ChannelRiskFactor,
} from '@/lib/ai-cmo/channel-risk/ruleset';
import {
  fetchLiveSignalsByChannel,
  type ChannelLiveSignals,
} from '@/lib/ai-cmo/channel-risk/live-signals';

export type { ChannelLiveSignals };

export type ChannelRiskRow = {
  channel: string;
  displayName: string;
  score: number;
  riskTier: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  factors: ChannelRiskFactor[];
  violations: number;
  criticalCount: number;
  highCount: number;
  lastUpdatedAt: string;
  /** CLOSED: S15-004-002 — null when publish-attempt table unavailable */
  liveSignals?: ChannelLiveSignals | null;
};

export type ChannelRiskSummary = {
  workspaceId: string;
  channels: ChannelRiskRow[];
  totalViolations: number;
  generatedAt: string;
};

type EvaluationRow = {
  risk_tier: string;
  created_at?: string | null;
  ai_cmo_content_pieces: { channel?: string | null };
};

function buildRow(
  channelKey: string,
  stats: { violations: number; criticalCount: number; highCount: number; lastUpdatedAt?: string },
  liveByChannel: Map<string, ChannelLiveSignals> | null,
  liveSignalsAvailable: boolean,
): ChannelRiskRow {
  const rule = findChannelRule(channelKey);
  const baseScore = rule?.baseScore ?? 15;
  const score = computeChannelScore({
    baseScore,
    violations: stats.violations,
    criticalCount: stats.criticalCount,
    highCount: stats.highCount,
  });

  const rejectionFactor: ChannelRiskFactor | null =
    stats.violations > 0
      ? {
          id: 'historical_rejections',
          label: `${stats.violations} HIGH/CRITICAL evaluation(s) in workspace`,
          severity: stats.criticalCount > 0 ? 'HIGH' : 'MEDIUM',
        }
      : null;

  const factors = [...(rule?.factors ?? []), ...(rejectionFactor ? [rejectionFactor] : [])];

  const ruleChannel = rule?.channel ?? channelKey;
  const liveSignals = liveSignalsAvailable
    ? (liveByChannel?.get(ruleChannel) ??
        liveByChannel?.get(channelKey) ?? {
          rejectionRate24h: 0,
          lastRejectionReason: null,
        })
    : null;

  return {
    channel: ruleChannel,
    displayName: rule?.displayName ?? channelKey,
    score,
    riskTier: scoreToRiskTier(score),
    factors,
    violations: stats.violations,
    criticalCount: stats.criticalCount,
    highCount: stats.highCount,
    lastUpdatedAt: stats.lastUpdatedAt ?? new Date().toISOString(),
    liveSignals,
  };
}

export async function aggregateChannelRisk(workspaceId: string): Promise<ChannelRiskSummary> {
  const generatedAt = new Date().toISOString();

  const { data: evaluations, error } = await supabaseAdmin
    .from('ai_cmo_evaluations')
    .select(
      `
      id,
      risk_tier,
      created_at,
      content_id,
      ai_cmo_content_pieces!inner (
        id,
        channel
      )
    `,
    )
    .eq('workspace_id', workspaceId)
    .in('risk_tier', ['HIGH', 'CRITICAL']);

  const statsByChannel = new Map<
    string,
    { violations: number; criticalCount: number; highCount: number; lastUpdatedAt?: string }
  >();

  if (!error && evaluations?.length) {
    for (const row of evaluations as EvaluationRow[]) {
      const channel = normalizeChannelKey(row.ai_cmo_content_pieces?.channel ?? 'unknown');
      const existing = statsByChannel.get(channel) ?? {
        violations: 0,
        criticalCount: 0,
        highCount: 0,
      };

      existing.violations += 1;
      if (row.risk_tier === 'CRITICAL') existing.criticalCount += 1;
      if (row.risk_tier === 'HIGH') existing.highCount += 1;

      if (row.created_at) {
        const prev = existing.lastUpdatedAt;
        if (!prev || row.created_at > prev) {
          existing.lastUpdatedAt = row.created_at;
        }
      }

      statsByChannel.set(channel, existing);
    }
  }

  const channelKeys = new Set<string>([
    ...CHANNEL_RISK_RULESET.map((r) => r.channel),
    ...statsByChannel.keys(),
  ]);

  const liveByChannel = await fetchLiveSignalsByChannel(workspaceId);
  const liveSignalsAvailable = liveByChannel !== null;

  const channels = [...channelKeys]
    .map((key) =>
      buildRow(
        key,
        statsByChannel.get(key) ?? { violations: 0, criticalCount: 0, highCount: 0 },
        liveByChannel,
        liveSignalsAvailable,
      ),
    )
    .sort((a, b) => b.score - a.score);

  const totalViolations = channels.reduce((sum, c) => sum + c.violations, 0);

  return { workspaceId, channels, totalViolations, generatedAt };
}

/** Advisory strings for policy review — does not override CRITICAL tier logic. */
export function channelRiskAdvisories(
  summary: ChannelRiskSummary,
  platforms: string[],
): string[] {
  const advisories: string[] = [];
  for (const platform of platforms) {
    const key = normalizeChannelKey(platform);
    const row = summary.channels.find(
      (c) => c.channel === key || normalizeChannelKey(c.displayName) === key,
    );
    if (row && (row.riskTier === 'HIGH' || row.riskTier === 'CRITICAL')) {
      advisories.push(
        `Channel risk advisory (${row.displayName}): ${row.riskTier} — score ${row.score}`,
      );
    }
  }
  return advisories;
}
