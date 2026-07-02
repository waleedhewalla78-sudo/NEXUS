/**
 * Background processor for async AI CMO campaign jobs (Phase B).
 */

import type Redis from 'ioredis';
import { runCampaignWorkflow } from '@/lib/orchestration/workflows/campaign-workflow';
import { buildCampaignWorkflowDeps } from '@/lib/orchestration/campaign-workflow-deps';
import { confidenceBand } from '@/lib/evaluation/calibrated-confidence';
import { renderExplainability } from '@/lib/explainability/renderer';
import { withAiCmoSpan } from '@/lib/telemetry/ai-cmo-tracer';
import { checkBudgetPolicy } from '@/lib/ai-cmo/finops/budget-policy';
import {
  CAMPAIGN_QUEUE_KEY,
  CAMPAIGN_REPLAN_QUEUE_KEY,
  updateCampaignJob,
  type CampaignJobRecord,
} from '@/lib/ai-cmo/campaign-job-store';

export type CampaignJobPayload = {
  jobId: string;
  workspaceId: string;
  userId: string;
  objective: string;
  brandId?: string;
  brandName?: string;
  locale?: string;
  persona?: 'executive' | 'operator' | 'compliance';
  workspaceDifyApiKey?: string | null;
  campaignId?: string;
  reason?: string;
};

async function processCampaignJob(redis: Redis, payload: CampaignJobPayload): Promise<void> {
  await updateCampaignJob(redis, payload.jobId, { status: 'running' });

  const budget = await checkBudgetPolicy({ workspaceId: payload.workspaceId });
  if (!budget.allowed) {
    await updateCampaignJob(redis, payload.jobId, {
      status: 'failed',
      error: budget.reason,
    });
    return;
  }

  let resolvedCampaignId = payload.campaignId;

  const { deps, getIds } = buildCampaignWorkflowDeps({
    workspaceId: payload.workspaceId,
    userId: payload.userId,
    brandName: payload.brandName,
    brandId: payload.brandId,
    locale: payload.locale ?? 'en-US',
    workspaceDifyApiKey: payload.workspaceDifyApiKey,
    campaignId: resolvedCampaignId,
  });

  try {
    const result = await withAiCmoSpan({
      name: 'ai_cmo.process_campaign_job',
      attributes: { workspace_id: payload.workspaceId, job_id: payload.jobId },
      fn: async () =>
        runCampaignWorkflow(
          {
            campaignId: resolvedCampaignId ?? 'pending',
            workspaceId: payload.workspaceId,
            objective: payload.objective,
          },
          deps,
        ),
    });

    const persisted = getIds();
    if (persisted.campaignId) {
      resolvedCampaignId = persisted.campaignId;
    }

    const persona = payload.persona ?? 'operator';
    const confidence = result.status === 'published' ? 0.88 : result.status === 'approval_required' ? 0.72 : 0.55;
    const explainability = renderExplainability({
      persona,
      decision: `Campaign workflow: ${result.status}`,
      confidence,
      confidenceBand: confidenceBand(confidence),
      policySummary: result.reason,
      recommendedAction:
        result.status === 'published'
          ? 'Content scheduled via reconciler → publish worker'
          : 'Review and approve before publish',
    });

    await updateCampaignJob(redis, payload.jobId, {
      status: 'completed',
      campaignId: resolvedCampaignId,
      result: {
        status: result.status,
        reason: result.reason,
        confidence,
        confidenceBand: confidenceBand(confidence),
        explainability,
        campaignId: persisted.campaignId,
        postId: persisted.postId,
        contentId: persisted.contentId,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await updateCampaignJob(redis, payload.jobId, {
      status: 'failed',
      error: message,
    });
  }
}

export async function startCampaignJobConsumer(redis: Redis): Promise<void> {
  console.log('[Worker] Started AI CMO campaign job consumer (BRPOP).');

  while (true) {
    try {
      const result = await redis.brpop(CAMPAIGN_QUEUE_KEY, 5);
      if (!result) continue;

      const payload = JSON.parse(result[1]) as CampaignJobPayload;
      console.log('[Worker] Processing campaign job:', payload.jobId);
      await processCampaignJob(redis, payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[Worker] Campaign job consumer error:', message);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

export async function startCampaignReplanConsumer(redis: Redis): Promise<void> {
  console.log('[Worker] Started AI CMO replan consumer (BRPOP).');

  while (true) {
    try {
      const result = await redis.brpop(CAMPAIGN_REPLAN_QUEUE_KEY, 5);
      if (!result) continue;

      const payload = JSON.parse(result[1]) as Omit<CampaignJobPayload, 'jobId' | 'objective'> & {
        reason: string;
      };

      const { enqueueCampaignJob } = await import('@/lib/ai-cmo/campaign-job-store');
      await enqueueCampaignJob({
        redis,
        workspaceId: payload.workspaceId,
        userId: payload.userId ?? `worker-${payload.workspaceId}`,
        objective: payload.reason,
        campaignId: payload.campaignId,
      });

      console.log('[Worker] Replan job enqueued for workspace:', payload.workspaceId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[Worker] Replan consumer error:', message);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

export const campaignOrchestrationUtils = {
  startCampaignJobConsumer,
  startCampaignReplanConsumer,
};
