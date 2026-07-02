import { describe, it, expect, vi, beforeEach } from 'vitest';

const generateMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/ai-cmo/agents/quant-data', () => ({
  fetchQuantTimeSeries: vi.fn().mockResolvedValue({
    workspaceId: '550e8400-e29b-41d4-a716-446655440000',
    periodDays: 7,
    hourly: [{ hour: 18, impressions: 5000, clicks: 250, conversions: 10, ctr: 0.05 }],
    daily: [
      { date: '2026-06-01', impressions: 10000, clicks: 400, conversions: 20, ctr: 0.04 },
      { date: '2026-06-07', impressions: 12000, clicks: 600, conversions: 30, ctr: 0.05 },
    ],
    totals: { impressions: 22000, clicks: 1000, conversions: 50, ctr: 0.0455 },
  }),
}));

vi.mock('@/lib/ai-cmo/providers/provider-router', () => ({
  providerRouter: {
    generate: generateMock,
    complete: generateMock,
  },
}));

import { quantAgent } from '@/lib/ai-cmo/agents/quant-agent';

describe('QuantAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateMock.mockResolvedValue({
      text: JSON.stringify({
        summary: 'Posts at 6 PM show 40% higher CTR',
        brainHints: ['Schedule more evening posts'],
        confidence: 0.82,
      }),
      stubbed: false,
      modelUsed: 'openrouter/test',
    });
  });

  it('returns time-series insights from post_analytics aggregation', async () => {
    const output = await quantAgent.run({
      workspaceId: '550e8400-e29b-41d4-a716-446655440000',
      userId: 'user-1',
      analytics: { impressions: 1000, clicks: 50, conversions: 5, periodDays: 7 },
    });

    expect(generateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        agentRole: 'quant',
        userPrompt: expect.stringContaining('hourly'),
      }),
    );
    expect(output.proposal.ctr).toBeGreaterThan(0);
    expect(output.proposal.brainHints.length).toBeGreaterThan(0);
  });
});
