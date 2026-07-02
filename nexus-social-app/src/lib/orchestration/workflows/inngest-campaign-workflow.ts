// INSTALL: npm install inngest
/**
 * Feature 004 — Durable Inngest campaign workflow (Phase 4).
 *
 * Step order:
 * 0. finops-preflight
 * 1. plan
 * 2. retrieve-memory
 * 3. generate
 * 4. check-uniqueness (SEO cannibalization guard)
 * 5. structured-policy-review
 * 6. evaluate (LLM-as-Judge + persist to ai_cmo_evaluations)
 * 6. revise-content (optional, 1 retry if quality low but not hallucination)
 * 7. evaluate-retry (if revised)
 * 8. persist
 * 9. link-post
 */

import type Redis from 'ioredis';
import { buildCampaignWorkflowDeps } from '@/lib/orchestration/campaign-workflow-deps';
import {
  type CampaignWorkflowEvaluateStepOutput,
  type CampaignWorkflowGenerateStepOutput,
  type CampaignWorkflowLinkPostStepOutput,
  type CampaignWorkflowPayload,
  type CampaignWorkflowPersistStepOutput,
  type CampaignWorkflowPlanStepOutput,
  type CampaignWorkflowStepOutput,
  type InngestStepRunner,
  createPassthroughStepRunner,
} from '@/lib/orchestration/types/campaign-workflow';
import { AI_CMO_INNGEST_EVENT_NAMES } from '@/lib/orchestration/types/events';
import { getInngestClient, sendAiCmoInngestEvent } from '@/lib/orchestration/inngest-client';
import { linkCampaignPostViaReconciler } from '@/lib/ai-cmo/services/campaign-post-linker';
import type { QualityEvaluationResult } from '@/lib/ai-cmo/quality/types';
import type { CreatedContent } from '@/lib/ai-cmo/creator-agent';
import { updateCampaignJob } from '@/lib/ai-cmo/campaign-job-store';
import { getRedisClient } from '@/lib/redis-client';
import { uniquenessGuard } from '@/lib/ai-cmo/quality/uniqueness-guard';
import { withAiCmoSpan } from '@/lib/telemetry/ai-cmo-tracer';
import { BudgetExceededError, isBudgetExceededError } from '@/lib/governance/errors';
import type { PolicyResult } from '@/lib/governance/types/policy';
import type { CampaignWorkflowDeps } from '@/lib/orchestration/workflows/campaign-workflow';

function requiresHumanApproval(policy: PolicyResult): boolean {
  return policy.requiresApproval && (policy.riskTier === 'HIGH' || policy.riskTier === 'CRITICAL');
}

function buildEvaluateOutput(
  evaluation: QualityEvaluationResult,
  persistResult: { evaluationId: string },
): CampaignWorkflowEvaluateStepOutput {
  const primaryReason = evaluation.rejectionReasons[0];

  if (evaluation.autoRejected && primaryReason === 'HALLUCINATION') {
    return {
      shouldPublish: false,
      autoReject: true,
      autoRejected: true,
      score: evaluation.overallScore,
      reason: 'Hallucination detected — routed to DLQ',
      status: 'rejected',
      requiresRevision: false,
      rejectionReason: 'HALLUCINATION',
      evaluationId: persistResult.evaluationId,
      hallucinationFlag: true,
    };
  }

  if (evaluation.requiresRevision) {
    return {
      shouldPublish: false,
      autoReject: false,
      autoRejected: evaluation.autoRejected,
      score: evaluation.overallScore,
      reason: evaluation.revisionFeedback,
      status: 'rejected',
      requiresRevision: true,
      revisionFeedback: evaluation.revisionFeedback,
      rejectionReason: primaryReason,
      evaluationId: persistResult.evaluationId,
      hallucinationFlag: evaluation.hallucinationFlag,
    };
  }

  if (evaluation.autoRejected) {
    return {
      shouldPublish: false,
      autoReject: true,
      autoRejected: true,
      score: evaluation.overallScore,
      reason: evaluation.rejectionReasons.join(', '),
      status: 'rejected',
      requiresRevision: false,
      rejectionReason: primaryReason,
      evaluationId: persistResult.evaluationId,
      hallucinationFlag: evaluation.hallucinationFlag,
    };
  }

  if (!evaluation.shouldPublish) {
    return {
      shouldPublish: false,
      autoReject: false,
      autoRejected: false,
      score: evaluation.overallScore,
      reason: 'Quality below auto-publish threshold',
      status: 'approval_required',
      requiresRevision: false,
      evaluationId: persistResult.evaluationId,
      hallucinationFlag: evaluation.hallucinationFlag,
    };
  }

  return {
    shouldPublish: true,
    autoReject: false,
    autoRejected: false,
    score: evaluation.overallScore,
    status: 'published',
    requiresRevision: false,
    evaluationId: persistResult.evaluationId,
    hallucinationFlag: evaluation.hallucinationFlag,
  };
}

async function runEvaluateStep(
  deps: CampaignWorkflowDeps,
  generateOutput: CampaignWorkflowGenerateStepOutput,
  memory: unknown[],
): Promise<CampaignWorkflowEvaluateStepOutput> {
  const evaluation = await deps.runQualityEvaluation(generateOutput, memory);
  const persistResult = await deps.persistQualityEvaluation(generateOutput, evaluation);
  return buildEvaluateOutput(evaluation, persistResult);
}

export async function executeCampaignWorkflowSteps(
  payload: CampaignWorkflowPayload,
  step: InngestStepRunner = createPassthroughStepRunner(),
  redis?: Redis,
): Promise<CampaignWorkflowStepOutput> {
  return withAiCmoSpan({
    name: 'ai_cmo.inngest_campaign_workflow',
    attributes: {
      workspace_id: payload.workspaceId,
      job_id: payload.jobId,
    },
    fn: async () => {
      if (redis) {
        await updateCampaignJob(redis, payload.jobId, { status: 'running' });
      }

      const { deps, getIds } = buildCampaignWorkflowDeps({
        workspaceId: payload.workspaceId,
        userId: payload.userId,
        brandName: payload.brandName,
        brandId: payload.brandId,
        locale: payload.locale,
        workspaceDifyApiKey: payload.workspaceDifyApiKey,
        campaignId: payload.campaignId,
        workflowRunId: payload.jobId,
        targetAccountId: payload.targetAccountId,
        skipPostLink: true,
      });

      try {
        await step.run('finops-preflight', async () => deps.finopsPreflight());
      } catch (error) {
        if (isBudgetExceededError(error)) {
          const message = error instanceof Error ? error.message : 'Budget exceeded';
          const blocked = buildBlockedResult(payload, 'rejected', message, getIds);
          await finalizeJob(redis, payload, blocked);
          return blocked;
        }
        throw error;
      }

      const planOutput = await step.run('plan', async (): Promise<CampaignWorkflowPlanStepOutput> => {
        const planWrapper = await deps.planCampaign(payload.objective);
        return { plan: planWrapper, objective: payload.objective };
      });

      const memory = await step.run('retrieve-memory', async () =>
        deps.retrieveMemory(payload.objective),
      );

      let generateOutput = await step.run(
        'generate',
        async (): Promise<CampaignWorkflowGenerateStepOutput> => {
          const contentWrapper = await deps.generateContent(planOutput.plan, memory);
          return contentWrapper as CampaignWorkflowGenerateStepOutput;
        },
      );

      const uniquenessResult = await step.run('check-uniqueness', async () =>
        deps.checkContentUniqueness(generateOutput),
      );

      if (!uniquenessResult.isUnique) {
        const warning = uniquenessGuard.toWarning(uniquenessResult);
        await deps.routeToApproval(
          generateOutput,
          warning?.message ?? 'SEO cannibalization detected',
        );
        const blocked = buildBlockedResult(
          payload,
          'rejected',
          warning?.message ?? 'UNIQUENESS_TOO_LOW',
          getIds,
        );
        await finalizeJob(redis, payload, blocked);
        return blocked;
      }

      const policyResult = await step.run('structured-policy-review', async () =>
        deps.structuredPolicyReview(generateOutput),
      );

      if (requiresHumanApproval(policyResult)) {
        await deps.routeToApproval(generateOutput, policyResult.reason, policyResult.riskTier);
        const blocked = buildBlockedResult(
          payload,
          policyResult.riskTier === 'CRITICAL' ? 'policy_blocked' : 'approval_required',
          policyResult.reason,
          getIds,
        );
        await finalizeJob(redis, payload, blocked);
        return blocked;
      }

      let evaluateOutput = await step.run('evaluate', async () =>
        runEvaluateStep(deps, generateOutput, memory),
      );

      if (evaluateOutput.requiresRevision && evaluateOutput.revisionFeedback) {
        generateOutput = await step.run('revise-content', async () => {
          const revised = await deps.reviseContent(generateOutput, evaluateOutput.revisionFeedback!);
          return revised as CampaignWorkflowGenerateStepOutput;
        });

        evaluateOutput = await step.run('evaluate-retry', async () =>
          runEvaluateStep(deps, generateOutput, memory),
        );
      }

      if (evaluateOutput.status !== 'published') {
        if (evaluateOutput.rejectionReason === 'HALLUCINATION' || evaluateOutput.hallucinationFlag) {
          await deps.routeToApproval(generateOutput, 'Hallucination detected — DLQ');
        } else if (evaluateOutput.autoReject || evaluateOutput.autoRejected) {
          await deps.routeToApproval(generateOutput, evaluateOutput.reason ?? 'Quality auto-reject');
        } else {
          await deps.routeToApproval(generateOutput, evaluateOutput.reason ?? 'Quality gate failed');
        }

        const partial = buildBlockedResult(
          payload,
          evaluateOutput.status,
          evaluateOutput.reason,
          getIds,
        );
        await finalizeJob(redis, payload, partial);
        return partial;
      }

      const persistOutput = await step.run(
        'persist',
        async (): Promise<CampaignWorkflowPersistStepOutput> => {
          await deps.syncToSoR(generateOutput);
          const ids = getIds();
          if (!ids.campaignId || !ids.contentId) {
            throw new Error('Persist step did not produce campaignId/contentId');
          }
          return { campaignId: ids.campaignId, contentId: ids.contentId };
        },
      );

      const linkOutput = await step.run(
        'link-post',
        async (): Promise<CampaignWorkflowLinkPostStepOutput> => {
          const content = generateOutput.content as CreatedContent;
          const linkResult = await linkCampaignPostViaReconciler({
            workspaceId: payload.workspaceId,
            userId: payload.userId,
            campaignId: persistOutput.campaignId,
            contentId: persistOutput.contentId,
            content,
            brandId: payload.brandId,
          });

          if (!linkResult.ok) {
            throw new Error(linkResult.error);
          }

          return { postId: linkResult.postId, campaignId: linkResult.campaignId };
        },
      );

      const completed: CampaignWorkflowStepOutput = {
        jobId: payload.jobId,
        workspaceId: payload.workspaceId,
        campaignId: persistOutput.campaignId,
        contentId: persistOutput.contentId,
        postId: linkOutput.postId,
        status: 'published',
      };

      await finalizeJob(redis, payload, completed);

      await sendAiCmoInngestEvent({
        name: AI_CMO_INNGEST_EVENT_NAMES.CAMPAIGN_COMPLETED,
        data: {
          workspaceId: payload.workspaceId,
          campaignId: persistOutput.campaignId,
          jobId: payload.jobId,
          status: 'published',
          completedAt: new Date().toISOString(),
        },
      });

      return completed;
    },
  });
}

function buildBlockedResult(
  payload: CampaignWorkflowPayload,
  status: CampaignWorkflowEvaluateStepOutput['status'],
  reason: string | undefined,
  getIds: () => { campaignId?: string; contentId?: string; postId?: string },
): CampaignWorkflowStepOutput {
  const ids = getIds();
  return {
    jobId: payload.jobId,
    workspaceId: payload.workspaceId,
    campaignId: ids.campaignId ?? payload.campaignId,
    contentId: ids.contentId,
    postId: ids.postId,
    status,
    reason,
  };
}

async function finalizeJob(
  redis: Redis | undefined,
  payload: CampaignWorkflowPayload,
  result: CampaignWorkflowStepOutput,
): Promise<void> {
  if (!redis) return;

  const terminalStatus = result.status === 'published' ? 'completed' : 'failed';
  await updateCampaignJob(redis, payload.jobId, {
    status: terminalStatus,
    campaignId: result.campaignId,
    result: {
      status: result.status,
      reason: result.reason,
      campaignId: result.campaignId,
      contentId: result.contentId,
      postId: result.postId,
    },
    error: result.status === 'published' ? undefined : result.reason,
  });
}

export function getCampaignInngestFunctions(): unknown[] {
  const inngest = getInngestClient();

  const campaignWorkflow = inngest.createFunction(
    {
      id: 'campaign-workflow',
      retries: 3,
      triggers: [{ event: AI_CMO_INNGEST_EVENT_NAMES.CAMPAIGN_REQUESTED }],
    },
    async ({ event, step }) =>
      executeCampaignWorkflowSteps(
        event.data as CampaignWorkflowPayload,
        step as unknown as InngestStepRunner,
        getRedisClient(),
      ),
  );

  return [campaignWorkflow];
}

export const inngestCampaignWorkflowUtils = {
  executeCampaignWorkflowSteps,
  getCampaignInngestFunctions,
};
