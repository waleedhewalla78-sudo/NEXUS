/**
 * Feature 004 Sprint 15 — Radar scan Inngest cron (L3 orchestration).
 * Persists signals via L7 reconciler; emits ai-cmo/signal.detected for Brain.
 */

import { radarAgent } from '@/lib/ai-cmo/agents/radar-agent';
import { listActiveWorkspaceIds } from '@/lib/ai-cmo/agents/radar-data';
import { SorTableNames } from '@/lib/sync/reconciler';
import { secureSyncToSoR } from '@/lib/ai-cmo/utils/secure-reconciler-writer';
import { AI_CMO_INNGEST_EVENT_NAMES } from '@/lib/orchestration/types/events';
import { cron } from 'inngest';
import { getInngestClient, sendAiCmoInngestEvent } from '@/lib/orchestration/inngest-client';

export type RadarScanSummary = {
  workspacesScanned: number;
  signalsDetected: number;
  signalsPersisted: number;
};

export async function executeRadarScanForWorkspace(workspaceId: string): Promise<RadarScanSummary> {
  const userId = `radar-cron-${workspaceId}`;
  const output = await radarAgent.run({
    workspaceId,
    userId,
    locale: 'en-US',
    signals: [],
  });

  let signalsPersisted = 0;

  for (const proposal of output.proposal) {
    const persistResult = await secureSyncToSoR({
      table: SorTableNames.AI_CMO_EXTERNAL_SIGNALS,
      workspaceId,
      userId,
      auditAction: 'ai_cmo.radar.signal_persisted',
      data: {
        workspace_id: workspaceId,
        signal_id: proposal.signalId,
        source: 'radar',
        headline: proposal.headline,
        summary: proposal.recommendedAction,
        relevance_score: proposal.relevanceScore,
        recommended_action: proposal.recommendedAction,
        topics: proposal.topics,
        raw_payload: { topics: proposal.topics },
        detected_at: new Date().toISOString(),
      },
    });

    if (persistResult.ok) {
      signalsPersisted += 1;
    }

    await sendAiCmoInngestEvent({
      name: AI_CMO_INNGEST_EVENT_NAMES.SIGNAL_DETECTED,
      data: {
        workspaceId,
        signalId: proposal.signalId,
        headline: proposal.headline,
        relevanceScore: proposal.relevanceScore,
        detectedAt: new Date().toISOString(),
      },
    });
  }

  return {
    workspacesScanned: 1,
    signalsDetected: output.proposal.length,
    signalsPersisted,
  };
}

export async function executeRadarScanAllWorkspaces(): Promise<RadarScanSummary> {
  const workspaceIds = await listActiveWorkspaceIds();
  let signalsDetected = 0;
  let signalsPersisted = 0;

  for (const workspaceId of workspaceIds) {
    const result = await executeRadarScanForWorkspace(workspaceId);
    signalsDetected += result.signalsDetected;
    signalsPersisted += result.signalsPersisted;
  }

  return {
    workspacesScanned: workspaceIds.length,
    signalsDetected,
    signalsPersisted,
  };
}

export function getRadarScanInngestFunctions(): unknown[] {
  const inngest = getInngestClient();

  const radarScan = inngest.createFunction(
    { id: 'radar-scan', name: 'Radar Scan (4h)', triggers: [cron('0 */4 * * *')] },
    async () => executeRadarScanAllWorkspaces(),
  );

  return [radarScan];
}
