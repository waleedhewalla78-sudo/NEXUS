import { describe, expect, it, vi, beforeEach } from 'vitest';
import { OptimizerAgent } from '@/lib/ai-cmo/agents/optimizer-agent';

vi.mock('@/lib/ai-cmo/memory/memory-repository', () => ({
  memoryRepository: {
    getOutcomes: vi.fn(),
    retrieve: vi.fn(),
  },
}));

vi.mock('@/lib/ai-cmo/providers/provider-router', () => ({
  providerRouter: {
    generate: vi.fn(),
  },
}));

vi.mock('@/lib/observability/trace-wrapper', () => ({
  traceAgentCall: vi.fn(async ({ fn }) => {
    const execution = await fn();
    return { result: execution, latencyMs: 10, traceId: 'trace-1' };
  }),
}));

import { memoryRepository } from '@/lib/ai-cmo/memory/memory-repository';
import { providerRouter } from '@/lib/ai-cmo/providers/provider-router';

describe('OptimizerAgent', () => {
  const agent = new OptimizerAgent();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty proposals when no outcomes measured', async () => {
    vi.mocked(memoryRepository.getOutcomes).mockResolvedValue([]);
    vi.mocked(memoryRepository.retrieve).mockResolvedValue([]);

    const output = await agent.run({
      workspaceId: '550e8400-e29b-41d4-a716-446655440000',
      campaignId: '660e8400-e29b-41d4-a716-446655440001',
    });

    expect(output.learnings).toEqual([]);
    expect(output.llmStubbed).toBe(true);
    expect(output.diagnosis).toContain('No measured outcomes');
    expect(providerRouter.generate).not.toHaveBeenCalled();
  });

  it('uses ProviderRouter for variance analysis when outcomes exist', async () => {
    vi.mocked(memoryRepository.getOutcomes).mockResolvedValue([
      {
        id: 'out-1',
        campaignId: '660e8400-e29b-41d4-a716-446655440001',
        impressions: 5000,
        clicks: 10,
        conversions: 1,
        leadsGenerated: 0,
        revenueAttributed: 0,
        cost: 50,
        roiRatio: -0.2,
        lessonsLearned: null,
        measuredAt: new Date().toISOString(),
      },
    ]);
    vi.mocked(memoryRepository.retrieve).mockResolvedValue([]);

    vi.mocked(providerRouter.generate).mockResolvedValue({
      text: JSON.stringify({
        diagnosis: 'CTR collapsed on primary channel — rotate creative',
        replanRecommended: true,
        learnings: [
          {
            learningType: 'channel',
            context: { metric: 'ctr' },
            action: { recommendation: 'Shift 20% budget to LinkedIn' },
            outcome: { clicks: 10 },
            roiImpact: -0.2,
            confidence: 0.82,
          },
        ],
        strategyDelta: {
          channels: ['linkedin'],
          budgetShiftPct: -10,
          rationale: 'Low CTR variance',
        },
      }),
      provider: 'openrouter',
      modelUsed: 'openai/gpt-4o-mini',
      stubbed: false,
      attemptedProviders: ['dify', 'openrouter'],
    });

    const output = await agent.run({
      workspaceId: '550e8400-e29b-41d4-a716-446655440000',
      campaignId: '660e8400-e29b-41d4-a716-446655440001',
    });

    expect(providerRouter.generate).toHaveBeenCalledOnce();
    expect(output.llmStubbed).toBe(false);
    expect(output.learnings.length).toBe(1);
    expect(output.diagnosis).toContain('CTR collapsed');
    expect(output.replanRecommended).toBe(true);
  });

  it('falls back to rule-based learnings when LLM returns empty', async () => {
    vi.mocked(memoryRepository.getOutcomes).mockResolvedValue([
      {
        id: 'out-1',
        campaignId: '660e8400-e29b-41d4-a716-446655440001',
        impressions: 5000,
        clicks: 10,
        conversions: 1,
        leadsGenerated: 0,
        revenueAttributed: 0,
        cost: 50,
        roiRatio: -0.2,
        lessonsLearned: null,
        measuredAt: new Date().toISOString(),
      },
    ]);
    vi.mocked(memoryRepository.retrieve).mockResolvedValue([]);

    vi.mocked(providerRouter.generate).mockResolvedValue({
      text: null,
      provider: 'none',
      modelUsed: 'openai/gpt-4o-mini',
      stubbed: true,
      attemptedProviders: [],
    });

    const output = await agent.run({
      workspaceId: '550e8400-e29b-41d4-a716-446655440000',
      campaignId: '660e8400-e29b-41d4-a716-446655440001',
    });

    expect(output.llmStubbed).toBe(true);
    expect(output.learnings.length).toBeGreaterThan(0);
    expect(output.replanRecommended).toBe(true);
  });
});
