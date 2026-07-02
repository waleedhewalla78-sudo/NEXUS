import { describe, it, expect, vi, beforeEach } from 'vitest';

const generateMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/ai-cmo/agents/finance-data', () => ({
  fetchFinanceSnapshot: vi.fn().mockResolvedValue({
    workspaceId: '550e8400-e29b-41d4-a716-446655440000',
    periodDays: 30,
    totalAiCostUsd: 500,
    totalRevenueUsd: 1200,
    netRoi: 1.4,
    campaignBreakdown: [],
  }),
}));

vi.mock('@/lib/ai-cmo/providers/provider-router', () => ({
  providerRouter: {
    generate: generateMock,
    complete: generateMock,
  },
}));

import { financeAgent } from '@/lib/ai-cmo/agents/finance-agent';

describe('FinanceAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateMock.mockResolvedValue({
      text: JSON.stringify({
        budgetReallocationHints: ['Shift 15% budget to top ROI campaigns'],
        summary: 'Strong net ROI at 140%',
      }),
      stubbed: false,
      modelUsed: 'openrouter/test',
    });
  });

  it('returns executive financial proposal from real snapshot', async () => {
    const output = await financeAgent.run({
      workspaceId: '550e8400-e29b-41d4-a716-446655440000',
      userId: 'user-1',
      campaignCostUsd: 500,
      revenueAttributedUsd: 1200,
      periodDays: 30,
    });

    expect(output.proposal.roi).toBe(1.4);
    expect(output.proposal.budgetReallocationHints.length).toBeGreaterThan(0);
    expect(output.proposal.summary).toContain('140%');
  });
});
