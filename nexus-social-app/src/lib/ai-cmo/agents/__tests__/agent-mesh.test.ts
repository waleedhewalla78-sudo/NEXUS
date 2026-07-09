import { describe, expect, it, vi, beforeEach } from 'vitest';
import { radarAgent } from '@/lib/ai-cmo/agents/radar-agent';
import { sentinelAgent } from '@/lib/ai-cmo/agents/sentinel-agent';
import { financeAgent } from '@/lib/ai-cmo/agents/finance-agent';
import { complianceAgent } from '@/lib/ai-cmo/agents/compliance-agent';
import { listMeshAgents, getMeshAgent } from '@/lib/ai-cmo/agents/registry';
import { AI_CMO_INNGEST_EVENT_NAMES } from '@/lib/orchestration/types/events';

/** Union of JSON keys parsed by mesh agents from providerRouter text responses. */
function buildMeshMockLlmPayload() {
  return {
    // radar-agent.ts — parseRadarLlm
    recommendedAction: 'Monitor channel mix and refresh creative',
    topics: ['trend', 'market'],
    relevanceScore: 0.8,
    // sentinel-agent.ts — JSON.parse on llm.text
    severity: 'high' as const,
    // finance-agent.ts — budgetReallocationHints + summary
    budgetReallocationHints: ['Maintain budget allocation'],
    summary: 'ROI healthy — no reallocation required',
    // compliance-agent.ts — advisories + summary (optional augment)
    advisories: [] as Array<{ jurisdiction: string; note: string }>,
  };
}

function buildMeshMockLlmResponse() {
  return {
    text: JSON.stringify(buildMeshMockLlmPayload()),
    provider: 'openrouter',
    modelUsed: 'openai/gpt-4o-mini',
    stubbed: false,
  };
}

const mockLlm = vi.hoisted(() => vi.fn().mockResolvedValue(buildMeshMockLlmResponse()));

vi.mock('@/lib/ai-cmo/agents/finance-data', () => ({
  fetchFinanceSnapshot: vi.fn().mockResolvedValue({
    workspaceId: '550e8400-e29b-41d4-a716-446655440000',
    periodDays: 30,
    totalAiCostUsd: 100,
    totalRevenueUsd: 250,
    netRoi: 1.5,
    campaignBreakdown: [],
  }),
}));

vi.mock('@/lib/governance/compliance-profile-store', () => ({
  getWorkspaceComplianceProfile: vi.fn().mockResolvedValue({
    profileId: 'global_default',
    meta: {
      id: 'global_default',
      label: 'Global default',
      description: 'Test',
      jurisdictions: ['generic'],
      arabicRegister: 'dialect_allowed',
    },
  }),
}));

vi.mock('@/lib/ai-cmo/providers/provider-router', () => ({
  providerRouter: {
    complete: mockLlm,
    generate: mockLlm,
  },
}));

vi.mock('@/lib/orchestration/inngest-client', () => ({
  sendAiCmoInngestEvent: vi.fn().mockResolvedValue({ ids: ['evt-1'] }),
}));

import { sendAiCmoInngestEvent } from '@/lib/orchestration/inngest-client';

const BASE = {
  workspaceId: '550e8400-e29b-41d4-a716-446655440000',
  userId: 'user-1',
};

const SAMPLE_SIGNAL = {
  source: 'listening',
  headline: 'Market shift detected',
  detectedAt: new Date().toISOString(),
  relevanceScore: 0.75,
};

describe('agent mesh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLlm.mockResolvedValue(buildMeshMockLlmResponse());
  });

  it('registers all mesh agent names including concierge', () => {
    const names = listMeshAgents();
    expect(names).toHaveLength(9);
    expect(names).toContain('radar');
    expect(names).toContain('compliance');
    expect(names).toContain('concierge');
    expect(getMeshAgent('radar')).toBe(radarAgent);
  });

  it('radar returns proposals for supplied signals', async () => {
    const result = await radarAgent.run({
      ...BASE,
      signals: [SAMPLE_SIGNAL],
      industry: 'saas',
    });
    expect(result.proposal.length).toBeGreaterThan(0);
    expect(result.proposal[0]?.headline).toBe(SAMPLE_SIGNAL.headline);
  });

  it('sentinel emits anomaly.detected event', async () => {
    const result = await sentinelAgent.run({
      ...BASE,
      thresholdPct: 30,
      anomalies: [
        {
          metric: 'engagement_rate',
          currentValue: 0.02,
          baselineValue: 0.04,
          dropPct: 50,
          detectedAt: new Date().toISOString(),
        },
      ],
    });
    expect(result.proposal[0]?.severity).toBeDefined();
    expect(sendAiCmoInngestEvent).toHaveBeenCalledWith(
      expect.objectContaining({ name: AI_CMO_INNGEST_EVENT_NAMES.ANOMALY_DETECTED }),
    );
  });

  it('finance returns ROI proposal without SoR writes', async () => {
    const result = await financeAgent.run({
      ...BASE,
      campaignCostUsd: 100,
      revenueAttributedUsd: 250,
      periodDays: 30,
    });
    expect(result.proposal.roi).toBeGreaterThan(0);
    expect(result.eventsEmitted).toHaveLength(0);
  });

  it('compliance augments policy engine without replacing it', async () => {
    const result = await complianceAgent.run({
      ...BASE,
      content: {
        caption: 'Contact us with your email address for personalized offers',
        locale: 'ar-AE',
      },
      jurisdictions: ['uae_pdpl'],
      policyRiskTier: 'LOW',
    });
    expect(result.proposal.augmentsPolicyEngine).toBe(true);
    expect(result.proposal.replacesPolicyEngine).toBe(false);
  });
});
