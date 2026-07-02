/**
 * Feature 004 Phase 3 — FinOps runtime types.
 */

import { z } from 'zod';

export const budgetPolicySchema = z.object({
  workspaceId: z.string().uuid(),
  scope: z.enum(['workspace', 'tenant', 'campaign']),
  period: z.enum(['daily', 'monthly']),
  capUsd: z.number().positive(),
  actionOnCap: z.enum(['block', 'require_approval', 'notify_only']).default('block'),
});

export type BudgetPolicy = z.infer<typeof budgetPolicySchema>;

export type BudgetCheckResult =
  | { allowed: true; spendUsd: number; capUsd: number | null; warnLevel?: number }
  | { allowed: false; reason: string; spendUsd: number; capUsd: number };

export type AgentCostMetadata = {
  workspaceId: string;
  userId: string;
  agentName: string;
  campaignId?: string | null;
  tokenCount: number;
  modelUsed?: string | null;
  amountUsd: number;
};

export type AgentExecutionResult<T> = {
  result: T;
  usageText?: string;
  tokenCount?: number;
  modelUsed?: string;
};
