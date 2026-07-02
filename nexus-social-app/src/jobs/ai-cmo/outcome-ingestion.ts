/**
 * Feature 004 Phase 2 — Outcome ingestion (003 post_analytics → 004 ai_cmo_campaign_outcomes).
 *
 * [SPEC]
 * - Read 003 post_analytics (read-only, no schema changes)
 * - Join ai_cmo_content_pieces on post_id → resolve campaign_id
 * - Calculate ROI: (revenue - cost) / max(cost, 1); fallback revenue from conversions * assumed value
 * - Write via secureSyncToSoR only (Phase 0 wrapper)
 * - Inngest cron: daily at 02:00 UTC when package installed
 */

import { supabaseAdmin } from '@/lib/supabase/server';
import { SorTableNames } from '@/lib/ai-cmo/types/reconciler';
import type {
  ContentPieceWithCampaign,
  IngestedOutcome,
  OutcomeIngestionResult,
  PostAnalyticsAggregate,
} from '@/lib/ai-cmo/types/outcome-ingestion';
import { cron } from 'inngest';
import { securePatchSoR, secureSyncToSoR } from '@/lib/ai-cmo/utils/secure-reconciler-writer';
import { getInngestClient, sendAiCmoInngestEvent } from '@/lib/orchestration/inngest-client';
import { AI_CMO_INNGEST_EVENT_NAMES } from '@/lib/orchestration/types/events';

const DEFAULT_CONVERSION_VALUE_USD = 25;

export function calculateRoiRatio(revenue: number, cost: number): number | null {
  if (cost <= 0 && revenue <= 0) return null;
  if (cost <= 0) return revenue > 0 ? 1 : null;
  return Number(((revenue - cost) / cost).toFixed(4));
}

export function buildIngestedOutcome(input: {
  workspaceId: string;
  campaignId: string;
  contentPieceId?: string;
  postId: string;
  analytics: PostAnalyticsAggregate;
  costUsd?: number;
  revenueUsd?: number;
}): IngestedOutcome {
  const revenue =
    input.revenueUsd ??
    input.analytics.conversions * DEFAULT_CONVERSION_VALUE_USD;
  const cost = input.costUsd ?? 0;

  return {
    workspaceId: input.workspaceId,
    campaignId: input.campaignId,
    contentPieceId: input.contentPieceId,
    postId: input.postId,
    impressions: input.analytics.impressions,
    clicks: input.analytics.clicks,
    conversions: input.analytics.conversions,
    leadsGenerated: input.analytics.conversions,
    revenueAttributed: revenue,
    cost,
    roiRatio: calculateRoiRatio(revenue, cost),
    engagementRate: input.analytics.engagement_rate,
    measuredAt: new Date().toISOString(),
  };
}

async function aggregatePostAnalytics(postId: string): Promise<PostAnalyticsAggregate | null> {
  const { data, error } = await supabaseAdmin
    .from('post_analytics')
    .select('impressions, clicks, conversions, engagement_rate')
    .eq('post_id', postId);

  if (error || !data?.length) {
    return null;
  }

  return (data as PostAnalyticsAggregate[]).reduce(
    (acc, row) => ({
      impressions: acc.impressions + (row.impressions ?? 0),
      clicks: acc.clicks + (row.clicks ?? 0),
      conversions: acc.conversions + (row.conversions ?? 0),
      engagement_rate: row.engagement_rate ?? acc.engagement_rate,
    }),
    { impressions: 0, clicks: 0, conversions: 0, engagement_rate: null as number | null },
  );
}

async function loadLinkedContentPieces(): Promise<ContentPieceWithCampaign[]> {
  const { data, error } = await supabaseAdmin
    .from('ai_cmo_content_pieces')
    .select('id, workspace_id, post_id, campaign_id')
    .not('post_id', 'is', null)
    .not('campaign_id', 'is', null);

  if (error || !data?.length) {
    return [];
  }

  return data as ContentPieceWithCampaign[];
}

async function fetchCampaignCostUsd(workspaceId: string, campaignId: string): Promise<number> {
  const { data } = await supabaseAdmin
    .from('ai_cmo_cost_ledger')
    .select('amount_usd')
    .eq('workspace_id', workspaceId)
    .eq('campaign_id', campaignId);

  if (!data?.length) return 0;

  return data.reduce((sum, row) => sum + Number(row.amount_usd ?? 0), 0);
}

async function persistIngestedOutcome(
  outcome: IngestedOutcome,
  userId: string,
  existingOutcomeId?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const outcomeData = {
    impressions: outcome.impressions,
    clicks: outcome.clicks,
    conversions: outcome.conversions,
    leads_generated: outcome.leadsGenerated,
    revenue_attributed: outcome.revenueAttributed,
    cost: outcome.cost,
    roi_ratio: outcome.roiRatio,
    lessons_learned: {
      engagement_rate: outcome.engagementRate,
      source: 'post_analytics',
      post_id: outcome.postId,
    },
  };

  if (existingOutcomeId) {
    const patch = await securePatchSoR(
      {
        table: SorTableNames.AI_CMO_CAMPAIGN_OUTCOMES,
        id: existingOutcomeId,
        workspaceId: outcome.workspaceId,
        userId,
        auditAction: 'ai_cmo.outcome.updated_from_analytics',
        auditMetadata: {
          campaignId: outcome.campaignId,
          postId: outcome.postId,
        },
        patch: outcomeData,
      },
      { workspaceId: outcome.workspaceId, skipRateLimit: true },
    );

    if (!patch.ok) {
      return { ok: false, error: patch.error };
    }

    return { ok: true };
  }

  const write = await secureSyncToSoR({
    table: SorTableNames.AI_CMO_CAMPAIGN_OUTCOMES,
    workspaceId: outcome.workspaceId,
    userId,
    auditAction: 'ai_cmo.outcome.ingested_from_analytics',
    auditMetadata: {
      campaignId: outcome.campaignId,
      postId: outcome.postId,
      contentPieceId: outcome.contentPieceId,
    },
    data: {
      workspace_id: outcome.workspaceId,
      campaign_id: outcome.campaignId,
      ...outcomeData,
    },
  });

  if (!write.ok) {
    return { ok: false, error: write.error };
  }

  return { ok: true };
}

export async function runOutcomeIngestion(): Promise<OutcomeIngestionResult> {
  const result: OutcomeIngestionResult = {
    processed: 0,
    synced: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
  };

  const contentPieces = await loadLinkedContentPieces();
  result.processed = contentPieces.length;

  for (const piece of contentPieces) {
    if (!piece.campaign_id || !piece.post_id) {
      result.skipped += 1;
      continue;
    }

    const analytics = await aggregatePostAnalytics(piece.post_id);
    if (!analytics || analytics.impressions === 0) {
      result.skipped += 1;
      continue;
    }

    const costUsd = await fetchCampaignCostUsd(piece.workspace_id, piece.campaign_id);
    const ingested = buildIngestedOutcome({
      workspaceId: piece.workspace_id,
      campaignId: piece.campaign_id,
      contentPieceId: piece.id,
      postId: piece.post_id,
      analytics,
      costUsd,
    });

    const { data: existingOutcome } = await supabaseAdmin
      .from('ai_cmo_campaign_outcomes')
      .select('id')
      .eq('campaign_id', piece.campaign_id)
      .maybeSingle();

    const userId = `worker-outcome-ingestion-${piece.workspace_id}`;
    const persisted = await persistIngestedOutcome(
      ingested,
      userId,
      existingOutcome?.id as string | undefined,
    );

    if (!persisted.ok) {
      result.errors += 1;
      console.warn('[outcome-ingestion] Write failed:', piece.campaign_id, persisted.error);
      continue;
    }

    if (existingOutcome?.id) {
      result.updated += 1;
    } else {
      result.synced += 1;
    }

    await sendAiCmoInngestEvent({
      name: AI_CMO_INNGEST_EVENT_NAMES.ANALYTICS_SYNCED,
      data: {
        workspaceId: ingested.workspaceId,
        postId: ingested.postId,
        campaignId: ingested.campaignId,
        syncedAt: new Date().toISOString(),
        metrics: {
          impressions: ingested.impressions,
          clicks: ingested.clicks,
          conversions: ingested.conversions,
          engagement_rate: ingested.engagementRate,
        },
      },
    });
  }

  return result;
}

// INSTALL: npm install inngest
export function getOutcomeIngestionInngestFunctions(): unknown[] {
  const inngest = getInngestClient();

  const outcomeIngestionCron = inngest.createFunction(
    { id: 'outcome-ingestion', retries: 2, triggers: [cron('0 2 * * *')] },
    async () => runOutcomeIngestion(),
  );

  return [outcomeIngestionCron];
}

export const outcomeIngestionUtils = {
  runOutcomeIngestion,
  buildIngestedOutcome,
  calculateRoiRatio,
  getOutcomeIngestionInngestFunctions,
};
