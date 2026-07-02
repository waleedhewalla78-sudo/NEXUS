/**
 * Feature 004 Phase 6 — Event-driven replan trigger (Redis bridge → Optimizer → Reconciler).
 *
 * [SPEC]
 * - Subscribes to ai-cmo/campaign.underperforming (from 003 Redis bridge)
 * - Runs OptimizerAgent.run(), persists proposals via secureSyncToSoR
 * - Does NOT mutate reconciler.ts — L7 boundary preserved
 */

import { optimizerAgent } from '@/lib/ai-cmo/agents/optimizer-agent';
import { persistOptimizerLearnings } from '@/lib/ai-cmo/optimizer-agent';
import type { OptimizerOutput } from '@/lib/ai-cmo/agents/types/optimizer';
import { AI_CMO_INNGEST_EVENT_NAMES } from '@/lib/orchestration/types/events';
import { getInngestClient } from '@/lib/orchestration/inngest-client';
import { withAiCmoSpan } from '@/lib/telemetry/ai-cmo-tracer';

export type ReplanEventPayload = {
  workspaceId: string;
  campaignId: string;
  trigger: 'underperforming' | 'budget_threshold' | 'manual';
  sourceEventId?: string;
  requestedAt: string;
  userId?: string;
};

export type ReplanStepOutput = {
  workspaceId: string;
  campaignId: string;
  diagnosis: string;
  learningsPersisted: number;
  replanRecommended: boolean;
  optimizerOutput: OptimizerOutput;
};

export async function executeReplanWorkflow(payload: ReplanEventPayload): Promise<ReplanStepOutput> {
  return withAiCmoSpan({
    name: 'ai_cmo.event_replan',
    attributes: {
      workspace_id: payload.workspaceId,
      campaign_id: payload.campaignId,
      trigger: payload.trigger,
    },
    fn: async () => {
      const optimizerOutput = await optimizerAgent.run({
        workspaceId: payload.workspaceId,
        campaignId: payload.campaignId,
      });

      const userId =
        payload.userId ?? `worker-replan-${payload.workspaceId}`;

      let learningsPersisted = 0;
      if (optimizerOutput.learnings.length > 0) {
        const results = await persistOptimizerLearnings({
          workspaceId: payload.workspaceId,
          userId,
          learnings: optimizerOutput.learnings,
        });
        learningsPersisted = results.filter((r) => r.ok).length;
      }

      return {
        workspaceId: payload.workspaceId,
        campaignId: payload.campaignId,
        diagnosis: optimizerOutput.diagnosis,
        learningsPersisted,
        replanRecommended: optimizerOutput.replanRecommended,
        optimizerOutput,
      };
    },
  });
}

export function getEventReplanInngestFunctions(): unknown[] {
  const inngest = getInngestClient();

  const triggerReplan = inngest.createFunction(
    {
      id: 'trigger-replan',
      retries: 2,
      triggers: [{ event: AI_CMO_INNGEST_EVENT_NAMES.CAMPAIGN_UNDERPERFORMING }],
    },
    async ({ event }) => executeReplanWorkflow(event.data as ReplanEventPayload),
  );

  return [triggerReplan];
}

export const eventReplanWorkflowUtils = {
  executeReplanWorkflow,
  getEventReplanInngestFunctions,
};
