import { describe, expect, it, vi, beforeEach } from 'vitest';
import { generateCampaignContent } from '@/lib/ai-cmo/creator-agent';

vi.mock('@/lib/ai/providers/provider-router', () => ({
  providerRouter: {
    generate: vi.fn(),
  },
}));

import { providerRouter } from '@/lib/ai/providers/provider-router';

const samplePlan = {
  objective: 'Launch product',
  audience: 'Marketers',
  channels: ['linkedin', 'x'],
  keyMessages: ['Save time'],
  contentThemes: ['automation'],
  kpis: ['signups'],
  horizon: 'tactical' as const,
  rawSummary: 'Tactical launch',
};

describe('creator agent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parses creator JSON from ProviderRouter', async () => {
    vi.mocked(providerRouter.generate).mockResolvedValue({
      text: JSON.stringify({
        caption: 'Automate your marketing stack today.',
        hashtags: ['#martech'],
        callToAction: 'Start free trial',
        platforms: ['linkedin'],
      }),
      provider: 'openrouter',
      modelUsed: 'openai/gpt-4o-mini',
      stubbed: false,
      attemptedProviders: ['dify', 'openrouter'],
    });

    const content = await generateCampaignContent({
      plan: samplePlan,
      userId: 'user-1',
      locale: 'en-US',
    });

    expect(content.caption).toContain('Automate');
    expect(content.hashtags).toContain('#martech');
    expect(content.platforms).toContain('linkedin');
  });

  it('falls back to plan key message when ProviderRouter unavailable', async () => {
    vi.mocked(providerRouter.generate).mockResolvedValue({
      text: null,
      provider: 'none',
      modelUsed: 'openai/gpt-4o-mini',
      stubbed: true,
      attemptedProviders: ['dify', 'openrouter'],
    });

    const content = await generateCampaignContent({
      plan: samplePlan,
      userId: 'user-1',
    });

    expect(content.caption).toBe('Save time');
  });
});
