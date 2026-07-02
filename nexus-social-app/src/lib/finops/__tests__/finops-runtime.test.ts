import { describe, expect, it, vi } from 'vitest';
import { assertBudgetAvailable } from '@/lib/finops/budget-guard';
import { withAgentCostTracking } from '@/lib/finops/cost-middleware';
import { BudgetExceededError } from '@/lib/governance/errors';

vi.mock('@/lib/ai-cmo/finops/budget-policy', () => ({
  checkBudgetPolicy: vi.fn(),
}));

vi.mock('@/lib/ai-cmo/finops/cost-ledger', () => ({
  estimateTokenCost: vi.fn(() => 0.05),
  estimateTokensFromText: vi.fn(() => 100),
  recordAgentCost: vi.fn().mockResolvedValue({ ok: true, id: 'cost-1' }),
}));

vi.mock('@/lib/observability/trace-wrapper', () => ({
  traceAgentCall: vi.fn(async ({ fn }) => ({
    result: await fn(),
    latencyMs: 10,
    tokenUsage: 100,
    traceId: 'trace-test',
  })),
}));

import { checkBudgetPolicy } from '@/lib/ai-cmo/finops/budget-policy';
import { recordAgentCost } from '@/lib/ai-cmo/finops/cost-ledger';

describe('budget guard', () => {
  it('throws BudgetExceededError when cap is hit', async () => {
    vi.mocked(checkBudgetPolicy).mockResolvedValue({
      allowed: false,
      reason: 'Monthly cap exceeded',
      spendUsd: 120,
      capUsd: 100,
    });

    await expect(assertBudgetAvailable('ws-1')).rejects.toBeInstanceOf(BudgetExceededError);
  });

  it('allows execution when budget check passes', async () => {
    vi.mocked(checkBudgetPolicy).mockResolvedValue({
      allowed: true,
      spendUsd: 10,
      capUsd: 100,
    });

    const result = await assertBudgetAvailable('ws-1');
    expect(result.allowed).toBe(true);
  });
});

describe('cost middleware', () => {
  it('records cost after agent execution via secure reconciler path', async () => {
    vi.mocked(checkBudgetPolicy).mockResolvedValue({
      allowed: true,
      spendUsd: 0,
      capUsd: 100,
    });

    const value = await withAgentCostTracking({
      workspaceId: '550e8400-e29b-41d4-a716-446655440000',
      userId: 'user-1',
      agentName: 'strategic_brain',
      fn: async () => ({
        result: { plan: 'ok' },
        usageText: 'sample output text for token estimation',
        modelUsed: 'openai/gpt-4o-mini',
      }),
    });

    expect(value).toEqual({ plan: 'ok' });
    expect(recordAgentCost).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: '550e8400-e29b-41d4-a716-446655440000',
        agentName: 'strategic_brain',
        amountUsd: 0.05,
      }),
    );
  });
});
