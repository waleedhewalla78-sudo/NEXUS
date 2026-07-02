import { describe, expect, it, vi, beforeEach } from 'vitest';
import { planCampaignStrategy } from '@/lib/ai-cmo/strategic-brain';

vi.mock('@/lib/ai/providers/provider-router', () => ({
  providerRouter: {
    generate: vi.fn(),
  },
}));

import { providerRouter } from '@/lib/ai/providers/provider-router';

describe('strategic brain', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parses OpenRouter JSON plan via ProviderRouter', async () => {
    vi.mocked(providerRouter.generate).mockResolvedValue({
      text: JSON.stringify({
        audience: 'B2B SaaS founders',
        channels: ['linkedin'],
        keyMessages: ['Scale faster'],
        contentThemes: ['productivity'],
        kpis: ['leads'],
        horizon: 'tactical',
        summary: 'Focus on LinkedIn thought leadership',
      }),
      provider: 'openrouter',
      modelUsed: 'openai/gpt-4o-mini',
      stubbed: false,
      attemptedProviders: ['dify', 'openrouter'],
    });

    const plan = await planCampaignStrategy({
      objective: 'Generate 50 demo requests',
      userId: 'user-1',
    });

    expect(plan.audience).toBe('B2B SaaS founders');
    expect(plan.channels).toEqual(['linkedin']);
    expect(plan.horizon).toBe('tactical');
  });

  it('returns fallback plan when ProviderRouter unavailable', async () => {
    vi.mocked(providerRouter.generate).mockResolvedValue({
      text: null,
      provider: 'none',
      modelUsed: 'openai/gpt-4o-mini',
      stubbed: true,
      attemptedProviders: ['dify', 'openrouter'],
    });

    const plan = await planCampaignStrategy({
      objective: 'Brand awareness',
      userId: 'user-1',
    });

    expect(plan.objective).toBe('Brand awareness');
    expect(plan.channels.length).toBeGreaterThan(0);
  });

  it('injects ABM funnel directive when targetAccountId is set', async () => {
    vi.mocked(providerRouter.generate).mockResolvedValue({
      text: JSON.stringify({
        audience: 'Enterprise telco',
        channels: ['linkedin'],
        keyMessages: ['ROI'],
        contentThemes: ['automation'],
        kpis: ['demo_requests'],
        horizon: 'tactical',
        summary: 'BOFU campaign',
      }),
      provider: 'openrouter',
      modelUsed: 'openai/gpt-4o-mini',
      stubbed: false,
      attemptedProviders: ['dify', 'openrouter'],
    });

    await planCampaignStrategy({
      objective: 'Win Vodafone Egypt',
      userId: 'user-1',
      targetAccountId: 'mock-vodafone',
    });

    const call = vi.mocked(providerRouter.generate).mock.calls[0]?.[0];
    expect(call?.userPrompt).toContain('Bottom-of-Funnel (BOFU)');
    expect(call?.userPrompt).toContain('Vodafone Egypt');
  });
});
