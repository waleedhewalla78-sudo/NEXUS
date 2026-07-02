import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  analyzeCampaignOutcome,
  persistOptimizerLearnings,
} from '@/lib/ai-cmo/optimizer-agent';

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

vi.mock('@/lib/ai-cmo/utils/secure-reconciler-writer', () => ({
  secureSyncToSoR: vi.fn().mockResolvedValue({ ok: true, id: 'learning-1' }),
}));

import { memoryRepository } from '@/lib/ai-cmo/memory/memory-repository';
import { providerRouter } from '@/lib/ai-cmo/providers/provider-router';
import { secureSyncToSoR } from '@/lib/ai-cmo/utils/secure-reconciler-writer';

describe('optimizer-agent barrel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(memoryRepository.retrieve).mockResolvedValue([]);
    vi.mocked(providerRouter.generate).mockResolvedValue({
      text: null,
      provider: 'none',
      modelUsed: 'openai/gpt-4o-mini',
      stubbed: true,
      attemptedProviders: [],
    });
  });

  it('returns empty learnings when no outcomes exist', async () => {
    vi.mocked(memoryRepository.getOutcomes).mockResolvedValue([]);

    const result = await analyzeCampaignOutcome({
      workspaceId: '550e8400-e29b-41d4-a716-446655440000',
      userId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      campaignId: '660e8400-e29b-41d4-a716-446655440001',
    });

    expect(result.learnings).toEqual([]);
    expect(result.replanRecommended).toBe(false);
  });

  it('extracts learnings from underperforming outcomes', async () => {
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

    const result = await analyzeCampaignOutcome({
      workspaceId: '550e8400-e29b-41d4-a716-446655440000',
      userId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      campaignId: '660e8400-e29b-41d4-a716-446655440001',
    });

    expect(result.learnings.length).toBeGreaterThan(0);
    expect(result.replanRecommended).toBe(true);
  });

  it('persists learnings via reconciler', async () => {
    await persistOptimizerLearnings({
      workspaceId: '550e8400-e29b-41d4-a716-446655440000',
      userId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      learnings: [
        {
          learningType: 'channel',
          context: { metric: 'ctr' },
          action: { recommendation: 'Test new channel' },
          outcome: { clicks: 10 },
          roiImpact: -0.1,
          confidence: 0.75,
        },
      ],
    });

    expect(secureSyncToSoR).toHaveBeenCalledWith(
      expect.objectContaining({ auditAction: 'ai_cmo.learning.created' }),
    );
  });
});
