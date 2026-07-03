import { describe, expect, it, vi, beforeEach } from 'vitest';
import { buildCampaignWorkflowDeps } from '@/lib/orchestration/campaign-workflow-deps';
import { runCampaignWorkflow } from '@/lib/orchestration/workflows/campaign-workflow';

vi.mock('@/lib/ai-cmo/strategic-brain', () => ({
  planCampaignStrategy: vi.fn().mockResolvedValue({
    objective: 'Grow signups',
    audience: 'SMB',
    channels: ['linkedin'],
    keyMessages: ['Try free'],
    contentThemes: ['trial'],
    kpis: ['signups'],
    horizon: 'tactical',
    rawSummary: 'Plan',
  }),
}));

vi.mock('@/lib/ai-cmo/channel-risk/aggregator', () => ({
  aggregateChannelRisk: vi.fn().mockResolvedValue({
    workspaceId: '550e8400-e29b-41d4-a716-446655440000',
    channels: [],
    totalViolations: 0,
    generatedAt: new Date().toISOString(),
  }),
  channelRiskAdvisories: vi.fn().mockReturnValue([]),
}));

vi.mock('@/lib/ai-cmo/agents/compliance-agent', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/ai-cmo/agents/compliance-agent')>();
  return {
    ...actual,
    complianceAgent: {
      run: vi.fn().mockResolvedValue({
        agentName: 'compliance',
        proposal: {
          jurisdictions: [],
          advisories: [],
          augmentsPolicyEngine: true,
          replacesPolicyEngine: false,
          summary: 'test',
        },
        eventsEmitted: [],
        llmStubbed: true,
      }),
    },
  };
});

vi.mock('@/lib/ai-cmo/creator-agent', () => ({
  generateCampaignContent: vi.fn().mockResolvedValue({
    caption: 'Start your free trial today with expert guides and proven tips for growth.',
    hashtags: ['#saas'],
    callToAction: 'Sign up',
    platforms: ['linkedin'],
    locale: 'en-US',
    draftMetadata: {},
  }),
  reviseCampaignContent: vi.fn().mockResolvedValue({
    caption: 'Revised trial caption with stronger hook and clearer CTA for growth.',
    hashtags: ['#saas'],
    callToAction: 'Sign up',
    platforms: ['linkedin'],
    locale: 'en-US',
    draftMetadata: {},
  }),
}));

vi.mock('@/lib/ai-cmo/campaign-service', () => ({
  createCampaignViaReconciler: vi.fn().mockResolvedValue({ ok: true, id: 'camp-new' }),
  persistContentPieceViaReconciler: vi.fn().mockResolvedValue({ ok: true, id: 'piece-1' }),
  persistLlmJudgeEvaluationViaReconciler: vi.fn().mockResolvedValue({ ok: true, id: 'eval-1' }),
  updateCampaignConfidenceViaReconciler: vi.fn().mockResolvedValue({ ok: true, id: 'camp-new' }),
}));

vi.mock('@/lib/ai-cmo/services/campaign-post-linker', () => ({
  linkCampaignPostViaReconciler: vi.fn().mockResolvedValue({ ok: true, postId: 'post-1', campaignId: 'camp-new' }),
}));

vi.mock('@/lib/governance/approval-service', () => ({
  approvalService: {
    createApprovalRequest: vi.fn().mockResolvedValue({ ok: true, id: 'appr-1' }),
  },
}));

vi.mock('@/lib/ai-cmo/memory/memory-repository', () => ({
  memoryRepository: {
    retrieve: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/lib/finops/budget-guard', () => ({
  assertBudgetAvailable: vi.fn().mockResolvedValue({ allowed: true, spendUsd: 0, capUsd: 100 }),
}));

vi.mock('@/lib/finops/cost-middleware', () => ({
  withAgentCostTracking: vi.fn(async ({ fn }) => {
    const execution = await fn();
    return execution.result;
  }),
}));

vi.mock('@/lib/ai-cmo/quality/quality-evaluator', () => ({
  qualityEvaluator: {
    evaluate: vi.fn().mockResolvedValue({
      dimensions: {
        accuracy: 0.9,
        brandAlignment: 0.9,
        localization: 0.9,
        uniqueness: 0.9,
        eeat: 0.9,
        engagement: 0.9,
        platformCompliance: 0.9,
        safety: 0.95,
      },
      overallScore: 0.9,
      hallucinationFlag: false,
      autoRejected: false,
      rejectionReasons: [],
      requiresRevision: false,
      shouldPublish: true,
      evaluatorModel: 'test',
    }),
  },
}));

vi.mock('@/lib/ai-cmo/quality/uniqueness-guard', () => ({
  checkContentUniqueness: vi.fn().mockResolvedValue({
    isUnique: true,
    similarityScore: 0.1,
    source: 'none',
    checkedAgainst: 0,
  }),
  uniquenessGuard: {
    toWarning: vi.fn(),
  },
}));

describe('campaign workflow deps', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs full workflow with LLM-as-Judge evaluation persistence', async () => {
    const { deps, getIds } = buildCampaignWorkflowDeps({
      workspaceId: '550e8400-e29b-41d4-a716-446655440000',
      userId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    });

    const result = await runCampaignWorkflow(
      {
        campaignId: 'pending',
        workspaceId: '550e8400-e29b-41d4-a716-446655440000',
        objective: 'Grow signups',
      },
      deps,
    );

    expect(['published', 'approval_required', 'rejected']).toContain(result.status);

    if (result.status === 'published') {
      const ids = getIds();
      expect(ids.postId).toBe('post-1');
      expect(ids.campaignId).toBe('camp-new');
    }
  });
});
