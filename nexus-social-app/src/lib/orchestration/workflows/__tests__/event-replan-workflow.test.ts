import { describe, expect, it, vi, beforeEach } from 'vitest';
import { executeReplanWorkflow } from '@/lib/orchestration/workflows/event-replan-workflow';

vi.mock('@/lib/ai-cmo/agents/optimizer-agent', () => ({
  optimizerAgent: {
    run: vi.fn(),
  },
}));

vi.mock('@/lib/ai-cmo/optimizer-agent', () => ({
  persistOptimizerLearnings: vi.fn(),
}));

import { optimizerAgent } from '@/lib/ai-cmo/agents/optimizer-agent';
import { persistOptimizerLearnings } from '@/lib/ai-cmo/optimizer-agent';

describe('event-replan workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs optimizer and persists learnings via reconciler', async () => {
    vi.mocked(optimizerAgent.run).mockResolvedValue({
      campaignId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
      workspaceId: '550e8400-e29b-41d4-a716-446655440000',
      diagnosis: 'Campaign underperforming vs expected KPIs',
      variance: { clicks: { expected: 50, actual: 10 } },
      learnings: [
        {
          learningType: 'channel',
          context: { metric: 'ctr' },
          action: { recommendation: 'Test alternate channels' },
          outcome: { clicks: 10 },
          roiImpact: -0.1,
          confidence: 0.75,
        },
      ],
      replanRecommended: true,
      llmStubbed: true,
    });

    vi.mocked(persistOptimizerLearnings).mockResolvedValue([{ ok: true, id: 'learning-1' }]);

    const result = await executeReplanWorkflow({
      workspaceId: '550e8400-e29b-41d4-a716-446655440000',
      campaignId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
      trigger: 'underperforming',
      requestedAt: new Date().toISOString(),
    });

    expect(result.learningsPersisted).toBe(1);
    expect(result.replanRecommended).toBe(true);
    expect(persistOptimizerLearnings).toHaveBeenCalledOnce();
  });
});
