/**
 * Enterprise ABM read models — shared by API routes and server actions.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type AbmAccountRow = {
  id: string;
  accountName: string;
  domain: string;
  industry: string;
  intentScore: number;
  buyerStage: 'awareness' | 'consideration' | 'decision';
  topics: string[];
  funnelStage: 'BOFU' | 'MOFU' | 'TOFU';
  touchpoints: number;
  lastUpdated: string;
};

export type AttributionChannelRow = {
  id: string;
  month: string;
  channel: string;
  touches: number;
  attributedRevenue: number;
  reportJson: Record<string, unknown>;
};

export function buyerStageToFunnel(stage: string): AbmAccountRow['funnelStage'] {
  if (stage === 'decision') return 'BOFU';
  if (stage === 'consideration') return 'MOFU';
  return 'TOFU';
}

export function deriveFunnelStageFromScore(topScore: number): AbmAccountRow['funnelStage'] {
  if (topScore >= 70) return 'BOFU';
  if (topScore >= 40) return 'MOFU';
  return 'TOFU';
}

export function scoreToBuyerStage(score: number): AbmAccountRow['buyerStage'] {
  if (score >= 70) return 'decision';
  if (score >= 40) return 'consideration';
  return 'awareness';
}

export function isMissingTableError(message: string): boolean {
  return /does not exist|relation|schema cache|PGRST205/i.test(message);
}

export async function queryAbmAccounts(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<{ accounts: AbmAccountRow[]; error?: string }> {
  const { data, error } = await supabase
    .from('account_intent_scores')
    .select(
      'id, account_name, domain, industry, intent_score, buyer_stage, topics, last_updated',
    )
    .eq('workspace_id', workspaceId)
    .order('intent_score', { ascending: false })
    .limit(50);

  if (error) {
    return { accounts: [], error: error.message };
  }

  const { data: touchRows } = await supabase
    .from('crm_activity_mirror')
    .select('account_domain')
    .eq('workspace_id', workspaceId);

  const touchByDomain = (touchRows ?? []).reduce<Record<string, number>>((acc, row) => {
    const d = String(row.account_domain ?? '').toLowerCase();
    if (d) acc[d] = (acc[d] ?? 0) + 1;
    return acc;
  }, {});

  const accounts: AbmAccountRow[] = (data ?? []).map((row) => {
    const domain = String(row.domain);
    const buyerStage = String(row.buyer_stage) as AbmAccountRow['buyerStage'];
    const topics = Array.isArray(row.topics) ? row.topics.map(String) : [];
    return {
      id: String(row.id),
      accountName: String(row.account_name),
      domain,
      industry: String(row.industry ?? 'General'),
      intentScore: Number(row.intent_score),
      buyerStage,
      topics,
      funnelStage: buyerStageToFunnel(buyerStage),
      touchpoints: touchByDomain[domain.toLowerCase()] ?? 0,
      lastUpdated: String(row.last_updated),
    };
  });

  return { accounts };
}

export async function queryAttributionChannels(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<{ rows: AttributionChannelRow[]; error?: string }> {
  const { data, error } = await supabase
    .from('attribution_reports')
    .select('id, month, channel, touches, attributed_revenue, report_json')
    .eq('workspace_id', workspaceId)
    .order('month', { ascending: false })
    .limit(100);

  if (error) {
    return { rows: [], error: error.message };
  }

  return {
    rows: (data ?? []).map((row) => ({
      id: String(row.id),
      month: String(row.month),
      channel: String(row.channel),
      touches: Number(row.touches),
      attributedRevenue: Number(row.attributed_revenue),
      reportJson: (row.report_json ?? {}) as Record<string, unknown>,
    })),
  };
}

export function aggregateAttributionForChart(rows: AttributionChannelRow[]) {
  const byChannel = rows.reduce<
    Record<string, { channel: string; touches: number; revenue: number }>
  >((acc, row) => {
    const key = row.channel;
    if (!acc[key]) acc[key] = { channel: key, touches: 0, revenue: 0 };
    acc[key].touches += row.touches;
    acc[key].revenue += row.attributedRevenue;
    return acc;
  }, {});

  return Object.values(byChannel).map((c) => ({
    channel: c.channel,
    touches: c.touches,
    revenue: Math.round(c.revenue),
  }));
}
