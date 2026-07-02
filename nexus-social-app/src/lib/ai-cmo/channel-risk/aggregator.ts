/**
 * Feature 004 Sprint 15 — Channel risk aggregation (read-only).
 */

import { supabaseAdmin } from '@/lib/supabase/server';

export type ChannelRiskRow = {
  channel: string;
  violations: number;
  criticalCount: number;
  highCount: number;
};

export type ChannelRiskSummary = {
  workspaceId: string;
  channels: ChannelRiskRow[];
  totalViolations: number;
};

export async function aggregateChannelRisk(workspaceId: string): Promise<ChannelRiskSummary> {
  const { data: evaluations, error } = await supabaseAdmin
    .from('ai_cmo_evaluations')
    .select(
      `
      id,
      risk_tier,
      auto_rejected,
      content_id,
      ai_cmo_content_pieces!inner (
        id,
        channel
      )
    `,
    )
    .eq('workspace_id', workspaceId)
    .in('risk_tier', ['HIGH', 'CRITICAL']);

  if (error || !evaluations?.length) {
    return { workspaceId, channels: [], totalViolations: 0 };
  }

  const byChannel = new Map<string, ChannelRiskRow>();

  for (const row of evaluations as Array<{
    risk_tier: string;
    ai_cmo_content_pieces: { channel?: string | null };
  }>) {
    const channel = row.ai_cmo_content_pieces?.channel ?? 'unknown';
    const existing = byChannel.get(channel) ?? {
      channel,
      violations: 0,
      criticalCount: 0,
      highCount: 0,
    };

    existing.violations += 1;
    if (row.risk_tier === 'CRITICAL') existing.criticalCount += 1;
    if (row.risk_tier === 'HIGH') existing.highCount += 1;
    byChannel.set(channel, existing);
  }

  const channels = [...byChannel.values()].sort((a, b) => b.violations - a.violations);
  const totalViolations = channels.reduce((sum, c) => sum + c.violations, 0);

  return { workspaceId, channels, totalViolations };
}
