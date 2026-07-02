/**
 * Feature 004 Phase 3 — Governance workflow errors.
 */

import type { RiskTier } from '@/lib/governance/types/policy';

export class ApprovalRequiredError extends Error {
  readonly code = 'APPROVAL_REQUIRED';
  readonly riskTier: RiskTier;
  readonly reason: string;
  readonly violations: Array<{ id: string; reason: string }>;

  constructor(params: {
    riskTier: RiskTier;
    reason: string;
    violations?: Array<{ id: string; reason: string }>;
  }) {
    super(`Approval required (${params.riskTier}): ${params.reason}`);
    this.name = 'ApprovalRequiredError';
    this.riskTier = params.riskTier;
    this.reason = params.reason;
    this.violations = params.violations ?? [];
  }
}

export class BudgetExceededError extends Error {
  readonly code = 'BUDGET_EXCEEDED';
  readonly spendUsd: number;
  readonly capUsd: number;

  constructor(params: { reason: string; spendUsd: number; capUsd: number }) {
    super(params.reason);
    this.name = 'BudgetExceededError';
    this.spendUsd = params.spendUsd;
    this.capUsd = params.capUsd;
  }
}

/** Inngest step boundaries may deserialize errors — match by name/code/message too. */
export function isBudgetExceededError(error: unknown): error is BudgetExceededError {
  if (error instanceof BudgetExceededError) return true;
  if (!error || typeof error !== 'object') return false;
  const record = error as { name?: string; code?: string; message?: string };
  if (record.name === 'BudgetExceededError' || record.code === 'BUDGET_EXCEEDED') return true;
  const msg = record.message ?? '';
  return /budget cap|monthly ai budget|fail-closed/i.test(msg);
}
