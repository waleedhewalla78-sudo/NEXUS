import { describe, it, expect, vi, beforeEach } from 'vitest';

const generateMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/ai-cmo/agents/radar-data', () => ({
  fetchRecentMentionSignals: vi.fn().mockResolvedValue([
    {
      source: 'listening',
      headline: 'Competitor launched new pricing tier',
      summary: 'Social mention spike detected',
      detectedAt: new Date().toISOString(),
      relevanceScore: 0.82,
    },
  ]),
}));

vi.mock('@/lib/ai-cmo/providers/provider-router', () => ({
  providerRouter: {
    complete: generateMock,
    generate: generateMock,
  },
}));

import { radarAgent } from '@/lib/ai-cmo/agents/radar-agent';

describe('RadarAgent prompt construction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateMock.mockResolvedValue({
      text: JSON.stringify({
        recommendedAction: 'Launch counter-positioning campaign',
        topics: ['pricing', 'competitive'],
        relevanceScore: 0.9,
      }),
      stubbed: false,
      modelUsed: 'openrouter/test',
    });
  });

  it('passes real listening signals to ProviderRouter', async () => {
    const output = await radarAgent.run({
      workspaceId: '550e8400-e29b-41d4-a716-446655440000',
      userId: 'user-1',
      locale: 'en-US',
      signals: [],
    });

    expect(generateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        agentRole: 'radar',
        userPrompt: expect.stringContaining('Competitor launched new pricing tier'),
      }),
    );
    expect(output.proposal.length).toBeGreaterThan(0);
    expect(output.proposal[0]?.recommendedAction).toContain('counter-positioning');
  });
});
