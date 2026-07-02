/**
 * Orchestration layer stub — Inngest not installed (see README).
 * Workflow steps are pure functions testable without external deps.
 */

import { withAiCmoSpan } from '@/lib/telemetry/ai-cmo-tracer';
import type { QualityEvaluationResult } from '@/lib/ai-cmo/quality/types';
import type { UniquenessCheckResult } from '@/lib/ai-cmo/quality/uniqueness-guard';
import type { PolicyResult, RiskTier } from '@/lib/governance/types/policy';
import type { BudgetCheckResult } from '@/lib/finops/types';

export type WorkflowStepResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type OrchestrationClient = {
  sendEvent: (params: { name: string; data: Record<string, unknown> }) => Promise<void>;
};

export function createStubOrchestrationClient(): OrchestrationClient {
  const queue: Array<{ name: string; data: Record<string, unknown> }> = [];

  return {
    async sendEvent(params) {
      queue.push(params);
    },
  };
}

export const orchestrationClient = createStubOrchestrationClient();

export type CampaignWorkflowDeps = {
  finopsPreflight: () => Promise<BudgetCheckResult>;
  planCampaign: (objective: string) => Promise<Record<string, unknown>>;
  retrieveMemory: (objective: string) => Promise<unknown[]>;
  generateContent: (plan: Record<string, unknown>, memory: unknown[]) => Promise<Record<string, unknown>>;
  checkContentUniqueness: (content: Record<string, unknown>) => Promise<UniquenessCheckResult>;
  reviseContent: (
    content: Record<string, unknown>,
    revisionFeedback: string,
  ) => Promise<Record<string, unknown>>;
  structuredPolicyReview: (content: Record<string, unknown>) => Promise<PolicyResult>;
  runQualityEvaluation: (
    content: Record<string, unknown>,
    memory?: unknown[],
  ) => Promise<QualityEvaluationResult>;
  persistQualityEvaluation: (
    content: Record<string, unknown>,
    evaluation: QualityEvaluationResult,
  ) => Promise<{ evaluationId: string; contentId: string }>;
  syncToSoR: (content: Record<string, unknown>) => Promise<void>;
  routeToApproval: (
    content: Record<string, unknown>,
    reason: string,
    riskTier?: RiskTier,
  ) => Promise<void>;
};

export type CampaignWorkflowInput = {
  campaignId: string;
  workspaceId: string;
  objective: string;
};

export type CampaignWorkflowOutput = {
  status: 'published' | 'approval_required' | 'rejected' | 'policy_blocked';
  reason?: string;
};

function requiresHumanApproval(policy: PolicyResult): boolean {
  return policy.requiresApproval && (policy.riskTier === 'HIGH' || policy.riskTier === 'CRITICAL');
}

export async function runCampaignWorkflow(
  input: CampaignWorkflowInput,
  deps: CampaignWorkflowDeps,
): Promise<CampaignWorkflowOutput> {
  return withAiCmoSpan({
    name: 'ai_cmo.run_campaign_workflow',
    attributes: {
      workspace_id: input.workspaceId,
      campaign_id: input.campaignId,
    },
    fn: async () => {
      await deps.finopsPreflight();

      const plan = await deps.planCampaign(input.objective);
      const memory = await deps.retrieveMemory(input.objective);
      let content = await deps.generateContent(plan, memory);

      const uniqueness = await deps.checkContentUniqueness(content);
      if (!uniqueness.isUnique) {
        await deps.routeToApproval(
          content,
          `SEO cannibalization detected (${Math.round(uniqueness.similarityScore * 100)}% similarity)`,
        );
        return {
          status: 'rejected',
          reason: 'UNIQUENESS_TOO_LOW',
        };
      }

      const policy = await deps.structuredPolicyReview(content);

      if (requiresHumanApproval(policy)) {
        await deps.routeToApproval(content, policy.reason, policy.riskTier);
        return {
          status: policy.riskTier === 'CRITICAL' ? 'policy_blocked' : 'approval_required',
          reason: policy.reason,
        };
      }

      let evaluation = await deps.runQualityEvaluation(content, memory);
      await deps.persistQualityEvaluation(content, evaluation);

      if (evaluation.autoRejected && evaluation.rejectionReasons.includes('HALLUCINATION')) {
        await deps.routeToApproval(content, 'Hallucination detected — auto-rejected');
        return { status: 'rejected', reason: 'HALLUCINATION' };
      }

      if (evaluation.requiresRevision) {
        content = await deps.reviseContent(content, evaluation.revisionFeedback ?? 'Improve quality');
        evaluation = await deps.runQualityEvaluation(content, memory);
        await deps.persistQualityEvaluation(content, evaluation);
      }

      if (evaluation.autoRejected) {
        await deps.routeToApproval(content, evaluation.rejectionReasons.join(', '));
        return { status: 'rejected', reason: evaluation.rejectionReasons.join(', ') };
      }

      if (!evaluation.shouldPublish) {
        await deps.routeToApproval(content, 'Quality below publish threshold');
        return { status: 'approval_required', reason: 'Quality below publish threshold' };
      }

      await deps.syncToSoR(content);
      return { status: 'published' };
    },
  });
}
