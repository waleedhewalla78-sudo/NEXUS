/**
 * @deprecated Use runOutcomeIngestion from outcome-ingestion.ts
 */
export { runOutcomeIngestion as syncCampaignOutcomesFromAnalytics } from '@/jobs/ai-cmo/outcome-ingestion';
export type { OutcomeIngestionResult as SyncOutcomesResult } from '@/lib/ai-cmo/types/outcome-ingestion';

import { runOutcomeIngestion } from '@/jobs/ai-cmo/outcome-ingestion';

export const syncOutcomesJobUtils = {
  syncCampaignOutcomesFromAnalytics: runOutcomeIngestion,
};
