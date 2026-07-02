/**
 * Attribution event ingestion — page views and UTM-tagged events via reconciler (S14-T007).
 */

import { SorTableNames, type SyncToSoRResult } from '@/lib/ai-cmo/types/reconciler';
import { secureSyncToSoR } from '@/lib/ai-cmo/utils/secure-reconciler-writer';

export type AttributionEventInput = {
  workspaceId: string;
  userId: string;
  visitorId: string;
  eventType: 'page_view' | 'click' | 'signup' | 'demo_request' | 'purchase';
  campaignId?: string | null;
  contentId?: string | null;
  agentName?: string | null;
  channel?: string | null;
  utmParams?: Record<string, unknown>;
  value?: number | null;
  isFirstTouch?: boolean;
};

export async function ingestAttributionEvent(input: AttributionEventInput): Promise<SyncToSoRResult> {
  return secureSyncToSoR({
    table: SorTableNames.AI_CMO_ATTRIBUTION_EVENTS,
    workspaceId: input.workspaceId,
    userId: input.userId,
    auditAction: 'ai_cmo.attribution.recorded',
    auditMetadata: {
      eventType: input.eventType,
      campaignId: input.campaignId,
      visitorId: input.visitorId,
    },
    data: {
      workspace_id: input.workspaceId,
      visitor_id: input.visitorId,
      event_type: input.eventType,
      campaign_id: input.campaignId ?? null,
      content_id: input.contentId ?? null,
      agent_name: input.agentName ?? null,
      channel: input.channel ?? null,
      utm_params: input.utmParams ?? {},
      value: input.value ?? null,
      is_first_touch: input.isFirstTouch ?? false,
    },
  });
}

export function parseUtmParams(searchParams: URLSearchParams): Record<string, string> {
  const utm: Record<string, string> = {};
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
    const value = searchParams.get(key);
    if (value) utm[key] = value;
  }
  return utm;
}

export const attributionIngestUtils = {
  ingestAttributionEvent,
  parseUtmParams,
};
