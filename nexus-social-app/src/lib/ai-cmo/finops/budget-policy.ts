/**
 * Budget policy pre-flight stub (Phase D).
 * Reads ai_cmo_budget_policies when present; defaults to allow when table missing or no policy.
 */

import { supabaseAdmin } from '@/lib/supabase/server';

export type BudgetCheckResult =
  | { allowed: true; spendUsd: number; capUsd: number | null; warnLevel?: number }
  | { allowed: false; reason: string; spendUsd: number; capUsd: number };

export type CheckBudgetInput = {
  workspaceId: string;
  campaignId?: string;
  estimatedCostUsd?: number;
};

const BUDGET_QUERY_TIMEOUT_MS = Number(process.env.FINOPS_BUDGET_QUERY_TIMEOUT_MS ?? '5000');

async function withBudgetQueryTimeout<T>(label: string, fn: () => Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      fn(),
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`FinOps ${label} timed out after ${BUDGET_QUERY_TIMEOUT_MS}ms`)),
          BUDGET_QUERY_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function failClosedTimeout(reason: string): BudgetCheckResult {
  return {
    allowed: false,
    reason,
    spendUsd: Number.MAX_SAFE_INTEGER,
    capUsd: 0,
  };
}

async function getWorkspaceSpendUsd(workspaceId: string): Promise<number> {
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const { data, error } = await withBudgetQueryTimeout('spend lookup', async () =>
    supabaseAdmin
      .from('ai_cmo_cost_ledger')
      .select('amount_usd')
      .eq('workspace_id', workspaceId)
      .gte('recorded_at', startOfMonth.toISOString()),
  );

  if (error || !data?.length) return 0;

  return data.reduce((sum, row) => sum + Number(row.amount_usd ?? 0), 0);
}

async function getWorkspaceCapUsd(workspaceId: string): Promise<number | null> {
  const { data, error } = await withBudgetQueryTimeout('cap lookup', async () =>
    supabaseAdmin
      .from('ai_cmo_budget_policies')
      .select('cap_usd, warn_thresholds, action_on_cap')
      .eq('workspace_id', workspaceId)
      .eq('scope', 'workspace')
      .eq('period', 'monthly')
      .limit(1)
      .maybeSingle(),
  );

  if (error?.code === '42P01' || error?.code === 'PGRST205') return null;
  if (error || !data) return null;

  return Number(data.cap_usd);
}

export async function checkBudgetPolicy(input: CheckBudgetInput): Promise<BudgetCheckResult> {
  try {
    const spendUsd = await getWorkspaceSpendUsd(input.workspaceId);
    const capUsd = await getWorkspaceCapUsd(input.workspaceId);
    const projected = spendUsd + (input.estimatedCostUsd ?? 0);

    if (capUsd == null || capUsd <= 0) {
      return { allowed: true, spendUsd: projected, capUsd: null };
    }

    const utilization = projected / capUsd;
    if (utilization >= 1) {
      return {
        allowed: false,
        reason: `Monthly AI budget cap ($${capUsd.toFixed(2)}) exceeded`,
        spendUsd: projected,
        capUsd,
      };
    }

    const warnLevel =
      utilization >= 0.95 ? 0.95 : utilization >= 0.8 ? 0.8 : utilization >= 0.5 ? 0.5 : undefined;

    return { allowed: true, spendUsd: projected, capUsd, warnLevel };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Budget policy lookup failed';
    return failClosedTimeout(`${message} — blocking spend (fail-closed)`);
  }
}

export const budgetPolicyUtils = {
  checkBudgetPolicy,
};
