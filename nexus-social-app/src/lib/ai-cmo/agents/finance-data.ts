/**
 * Feature 004 Sprint 16 — Finance agent data layer (read-only SQL).
 */

import { supabaseAdmin } from '@/lib/supabase/server';

export type FinanceSnapshot = {
  workspaceId: string;
  periodDays: number;
  totalAiCostUsd: number;
  totalRevenueUsd: number;
  netRoi: number;
  campaignBreakdown: Array<{
    campaignId: string;
    aiCostUsd: number;
    revenueUsd: number;
    netRoi: number;
  }>;
};

export async function fetchFinanceSnapshot(
  workspaceId: string,
  periodDays = 30,
): Promise<FinanceSnapshot> {
  const since = new Date();
  since.setDate(since.getDate() - periodDays);
  const sinceIso = since.toISOString();

  const [{ data: ledgerRows }, { data: outcomeRows }] = await Promise.all([
    supabaseAdmin
      .from('ai_cmo_cost_ledger')
      .select('campaign_id, amount_usd, created_at')
      .eq('workspace_id', workspaceId)
      .gte('created_at', sinceIso),
    supabaseAdmin
      .from('ai_cmo_campaign_outcomes')
      .select('campaign_id, revenue_attributed, cost, measured_at')
      .eq('workspace_id', workspaceId)
      .gte('measured_at', sinceIso),
  ]);

  const costByCampaign = new Map<string, number>();
  for (const row of ledgerRows ?? []) {
    const cid = String(row.campaign_id ?? 'unassigned');
    costByCampaign.set(cid, (costByCampaign.get(cid) ?? 0) + Number(row.amount_usd ?? 0));
  }

  const revenueByCampaign = new Map<string, number>();
  for (const row of outcomeRows ?? []) {
    const cid = String(row.campaign_id);
    revenueByCampaign.set(
      cid,
      (revenueByCampaign.get(cid) ?? 0) + Number(row.revenue_attributed ?? 0),
    );
  }

  const campaignIds = new Set([...costByCampaign.keys(), ...revenueByCampaign.keys()]);
  const campaignBreakdown = [...campaignIds].map((campaignId) => {
    const aiCostUsd = costByCampaign.get(campaignId) ?? 0;
    const revenueUsd = revenueByCampaign.get(campaignId) ?? 0;
    const netRoi = aiCostUsd > 0 ? (revenueUsd - aiCostUsd) / aiCostUsd : revenueUsd > 0 ? 1 : 0;
    return { campaignId, aiCostUsd, revenueUsd, netRoi: Number(netRoi.toFixed(4)) };
  });

  const totalAiCostUsd = campaignBreakdown.reduce((s, c) => s + c.aiCostUsd, 0);
  const totalRevenueUsd = campaignBreakdown.reduce((s, c) => s + c.revenueUsd, 0);
  const netRoi =
    totalAiCostUsd > 0
      ? Number(((totalRevenueUsd - totalAiCostUsd) / totalAiCostUsd).toFixed(4))
      : totalRevenueUsd > 0
        ? 1
        : 0;

  return {
    workspaceId,
    periodDays,
    totalAiCostUsd: Number(totalAiCostUsd.toFixed(2)),
    totalRevenueUsd: Number(totalRevenueUsd.toFixed(2)),
    netRoi,
    campaignBreakdown,
  };
}
