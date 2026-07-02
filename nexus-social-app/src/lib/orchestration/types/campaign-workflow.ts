/**
 * Feature 004 — Inngest campaign workflow payload and step outputs.
 */

import { z } from 'zod';
import { uuidLikeSchema } from '@/lib/validation/uuid-like';

export const campaignWorkflowPayloadSchema = z.object({
  jobId: uuidLikeSchema,
  workspaceId: uuidLikeSchema,
  userId: z.string().min(1),
  objective: z.string().min(1),
  brandId: z.string().uuid().optional().nullable(),
  brandName: z.string().optional(),
  locale: z.string().default('en-US'),
  persona: z.enum(['executive', 'operator', 'compliance']).default('operator'),
  targetAccountId: z.string().min(1).optional(),
  workspaceDifyApiKey: z.string().optional().nullable(),
  campaignId: z.string().uuid().optional(),
  idempotencyKey: z.string().min(8),
  requestedAt: z.string(),
});

export type CampaignWorkflowPayload = z.infer<typeof campaignWorkflowPayloadSchema>;

export type CampaignWorkflowPlanStepOutput = {
  plan: Record<string, unknown>;
  objective: string;
};

export type CampaignWorkflowGenerateStepOutput = {
  content: Record<string, unknown>;
  plan: Record<string, unknown>;
  quality: Record<string, unknown>;
  confidence: number;
  policyApproved?: boolean;
  rejectReasons?: string[];
  qualityEvaluation?: Record<string, unknown>;
};

export type CampaignWorkflowEvaluateStepOutput = {
  shouldPublish: boolean;
  autoReject: boolean;
  autoRejected: boolean;
  score: number;
  reason?: string;
  status: 'published' | 'approval_required' | 'rejected' | 'policy_blocked';
  requiresRevision: boolean;
  revisionFeedback?: string;
  rejectionReason?: string;
  evaluationId?: string;
  hallucinationFlag?: boolean;
};

export type CampaignWorkflowPersistStepOutput = {
  campaignId: string;
  contentId: string;
};

export type CampaignWorkflowLinkPostStepOutput = {
  postId: string;
  campaignId: string;
};

export type CampaignWorkflowStepOutput = {
  jobId: string;
  workspaceId: string;
  campaignId?: string;
  contentId?: string;
  postId?: string;
  status: CampaignWorkflowEvaluateStepOutput['status'];
  reason?: string;
};

export type InngestStepRunner = {
  run: <T>(stepId: string, fn: () => Promise<T>) => Promise<T>;
};

export function createPassthroughStepRunner(): InngestStepRunner {
  return {
    async run<T>(_stepId: string, fn: () => Promise<T>): Promise<T> {
      return fn();
    },
  };
}
