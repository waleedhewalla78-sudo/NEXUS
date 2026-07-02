/**
 * Feature 004 Phase 6 — Sentinel Inngest cron (L3 orchestration).
 * Scans active campaigns every 6h; SentinelAgent emits ai-cmo/anomaly.detected.
 */

import { sentinelAgent } from '@/lib/ai-cmo/agents/sentinel-agent';
import { listActiveCampaignTargets } from '@/lib/ai-cmo/agents/sentinel-data';
import { cron } from 'inngest';
import { getInngestClient } from '@/lib/orchestration/inngest-client';

export type SentinelScanSummary = {
  campaignsScanned: number;
  anomaliesDetected: number;
  eventsEmitted: number;
};

export async function executeSentinelScanAllCampaigns(): Promise<SentinelScanSummary> {
  const targets = await listActiveCampaignTargets();
  let anomaliesDetected = 0;
  let eventsEmitted = 0;

  for (const target of targets) {
    const output = await sentinelAgent.run({
      workspaceId: target.workspaceId,
      userId: `sentinel-cron-${target.campaignId}`,
      campaignId: target.campaignId,
      anomalies: [],
      thresholdPct: 30,
    });

    anomaliesDetected += output.proposal.length;
    eventsEmitted += output.eventsEmitted.length;
  }

  return {
    campaignsScanned: targets.length,
    anomaliesDetected,
    eventsEmitted,
  };
}

export function getSentinelCronInngestFunctions(): unknown[] {
  const inngest = getInngestClient();

  const sentinelScan = inngest.createFunction(
    { id: 'sentinel-scan', name: 'Sentinel Scan (6h)', triggers: [cron('0 */6 * * *')] },
    async () => executeSentinelScanAllCampaigns(),
  );

  return [sentinelScan];
}
