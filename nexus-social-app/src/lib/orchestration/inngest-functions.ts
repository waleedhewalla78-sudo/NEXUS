/**
 * Feature 004 — Aggregates all Inngest function registrations for the serve route.
 */

import { getCampaignInngestFunctions } from '@/lib/orchestration/workflows/inngest-campaign-workflow';
import { getOutcomeIngestionInngestFunctions } from '@/jobs/ai-cmo/outcome-ingestion';
import { getEventReplanInngestFunctions } from '@/lib/orchestration/workflows/event-replan-workflow';
import { getMvRefreshInngestFunctions } from '@/jobs/ai-cmo/mv-refresh';
import { getRadarScanInngestFunctions } from '@/lib/orchestration/workflows/radar-scan-workflow';
import { getSentinelCronInngestFunctions } from '@/lib/orchestration/workflows/sentinel-cron-workflow';
import { getQuantAnalyticsInngestFunctions } from '@/lib/orchestration/workflows/quant-analytics-consumer';
import { getInngestDlqFunctions } from '@/lib/orchestration/dlq/inngest-failure-handler';
import { getAttributionCalculationInngestFunctions } from '@/jobs/ai-cmo/attribution-calculation';
import { getIntelligenceBriefingInngestFunctions } from '@/lib/orchestration/workflows/intelligence-briefing-workflow';
import { getConversationInboundInngestFunctions } from '@/lib/orchestration/workflows/conversation-inbound-workflow';

export function getAllAiCmoInngestFunctions(): unknown[] {
  return [
    ...getCampaignInngestFunctions(),
    ...getOutcomeIngestionInngestFunctions(),
    ...getEventReplanInngestFunctions(),
    ...getMvRefreshInngestFunctions(),
    ...getRadarScanInngestFunctions(),
    ...getSentinelCronInngestFunctions(),
    ...getQuantAnalyticsInngestFunctions(),
    ...getInngestDlqFunctions(),
    ...getAttributionCalculationInngestFunctions(),
    ...getIntelligenceBriefingInngestFunctions(),
    ...getConversationInboundInngestFunctions(),
  ];
}

export const inngestFunctionsUtils = {
  getAllAiCmoInngestFunctions,
};
