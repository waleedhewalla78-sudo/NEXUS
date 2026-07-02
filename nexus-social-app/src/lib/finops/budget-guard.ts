/**
 * Feature 004 Phase 3 — Pre-flight budget guard before agent execution.
 */

import { checkBudgetPolicy } from '@/lib/ai-cmo/finops/budget-policy';
import { BudgetExceededError } from '@/lib/governance/errors';
import type { BudgetCheckResult } from '@/lib/finops/types';

const DEFAULT_MONTHLY_CAP_USD = Number(process.env.AI_CMO_DEFAULT_BUDGET_CAP_USD ?? '100');

export async function checkBudget(
  workspaceId: string,
  estimatedCostUsd = 0,
): Promise<BudgetCheckResult> {
  const result = await checkBudgetPolicy({
    workspaceId,
    estimatedCostUsd,
  });

  if (result.allowed) {
    if (result.capUsd == null && DEFAULT_MONTHLY_CAP_USD > 0) {
      const projected = result.spendUsd;
      if (projected > DEFAULT_MONTHLY_CAP_USD) {
        return {
          allowed: false,
          reason: `Default monthly AI budget cap ($${DEFAULT_MONTHLY_CAP_USD.toFixed(2)}) exceeded`,
          spendUsd: projected,
          capUsd: DEFAULT_MONTHLY_CAP_USD,
        };
      }
    }
    return result;
  }

  return result;
}

export async function assertBudgetAvailable(
  workspaceId: string,
  estimatedCostUsd = 0,
): Promise<BudgetCheckResult> {
  const result = await checkBudget(workspaceId, estimatedCostUsd);

  if (!result.allowed) {
    throw new BudgetExceededError({
      reason: result.reason,
      spendUsd: result.spendUsd,
      capUsd: result.capUsd,
    });
  }

  return result;
}

export const budgetGuardUtils = {
  checkBudget,
  assertBudgetAvailable,
  DEFAULT_MONTHLY_CAP_USD,
};
