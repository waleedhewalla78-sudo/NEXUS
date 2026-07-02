/**
 * Feature 004 Phase 6 — Quant analytics.synced Inngest consumer (L3 orchestration).
 */

import { quantAgent } from '@/lib/ai-cmo/agents/quant-agent';
import { AI_CMO_INNGEST_EVENT_NAMES } from '@/lib/orchestration/types/events';
import { getInngestClient } from '@/lib/orchestration/inngest-client';
import { supabaseAdmin } from '@/lib/supabase/server';

export type QuantAnalyticsEventData = {
  workspaceId: string;
  postId?: string;
  campaignId?: string;
  syncedAt?: string;
  metrics?: Record<string, unknown>;
};

export async function resolveCampaignIdFromEvent(
  data: QuantAnalyticsEventData,
): Promise<string | undefined> {
  if (data.campaignId) return data.campaignId;
  if (!data.postId) return undefined;

  const { data: piece } = await supabaseAdmin
    .from('ai_cmo_content_pieces')
    .select('campaign_id')
    .eq('post_id', data.postId)
    .eq('workspace_id', data.workspaceId)
    .maybeSingle();

  return piece?.campaign_id ? String(piece.campaign_id) : undefined;
}

export async function executeQuantAnalyticsConsumer(
  data: QuantAnalyticsEventData,
): Promise<{ insightsGenerated: boolean; campaignId?: string }> {
  const campaignId = await resolveCampaignIdFromEvent(data);
  const metrics = data.metrics ?? {};

  const impressions = Number(metrics.impressions ?? 0);
  const clicks = Number(metrics.clicks ?? 0);
  const conversions = Number(metrics.conversions ?? 0);
  const engagementRate =
    metrics.engagement_rate != null ? Number(metrics.engagement_rate) : undefined;

  await quantAgent.run({
    workspaceId: data.workspaceId,
    userId: `quant-consumer-${data.workspaceId}`,
    analytics: {
      impressions,
      clicks,
      conversions,
      engagementRate,
      periodDays: 7,
    },
  });

  return { insightsGenerated: true, campaignId };
}

export function getQuantAnalyticsInngestFunctions(): unknown[] {
  const inngest = getInngestClient();

  const quantConsumer = inngest.createFunction(
    {
      id: 'quant-analytics-synced',
      name: 'Quant Analytics Synced Consumer',
      triggers: [{ event: AI_CMO_INNGEST_EVENT_NAMES.ANALYTICS_SYNCED }],
    },
    async ({ event }: { event: { data: QuantAnalyticsEventData } }) =>
      executeQuantAnalyticsConsumer(event.data),
  );

  return [quantConsumer];
}
