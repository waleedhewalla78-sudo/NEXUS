/**
 * Feature 004 Phase 7 — E2E campaign workflow smoke test.
 * Proves: Preflight -> Plan -> Memory -> Generate -> Policy -> Evaluate -> Persist -> Link
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { executeCampaignWorkflowSteps } from '@/lib/orchestration/workflows/inngest-campaign-workflow';

const WORKSPACE_ID = '550e8400-e29b-41d4-a716-446655440000';
const USER_ID = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const JOB_ID = '550e8400-e29b-41d4-a716-446655440001';

export const createCampaignSmokeFixtures = () => ({
  payload: {
    jobId: JOB_ID,
    workspaceId: WORKSPACE_ID,
    userId: USER_ID,
    objective: 'Grow enterprise signups in MENA',
    brandName: 'Nexus Demo',
    locale: 'en-US',
    persona: 'operator' as const,
    idempotencyKey: 'smoke-test-key-001',
    requestedAt: new Date().toISOString(),
  },
  plan: {
    objective: 'Grow enterprise signups in MENA',
    audience: 'Enterprise ICP',
    channels: ['linkedin'],
    keyMessages: ['Start your free trial'],
    contentThemes: ['trial'],
    kpis: ['signups'],
    horizon: 'tactical' as const,
    rawSummary: 'Focus on LinkedIn trial conversion',
  },
  content: {
    caption: 'Start your free trial today with expert guides for enterprise growth.',
    hashtags: ['#saas'],
    callToAction: 'Sign up',
    platforms: ['linkedin'],
    locale: 'en-US',
    draftMetadata: { source: 'smoke_test' },
  },
});

vi.mock('@/lib/ai-cmo/strategic-brain', () => ({
  planCampaignStrategy: vi.fn(),
}));

vi.mock('@/lib/ai-cmo/creator-agent', () => ({
  generateCampaignContent: vi.fn(),
  reviseCampaignContent: vi.fn(),
}));

vi.mock('@/lib/ai-cmo/providers/provider-router', () => ({
  providerRouter: { complete: vi.fn().mockResolvedValue({ text: null, stubbed: true, provider: 'none', modelUsed: 'stub' }) },
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

vi.mock('@/lib/observability/trace-wrapper', () => ({
  traceAgentCall: vi.fn(async ({ fn }) => ({
    result: await fn(),
    latencyMs: 1,
    tokenUsage: 10,
    traceId: 'trace-smoke',
  })),
}));

vi.mock('@/lib/ai-cmo/memory/memory-repository', () => ({
  memoryRepository: {
    retrieve: vi.fn().mockResolvedValue([{ action: 'prior', outcome: 'good ctr' }]),
  },
}));

vi.mock('@/lib/governance/policy-engine-v2', () => ({
  policyEngineV2: {
    evaluate: vi.fn().mockReturnValue({
      approved: true,
      riskTier: 'LOW',
      reason: 'Approved',
      violations: [],
      requiresApproval: false,
    }),
  },
  contentPieceFromPlanAndContent: vi.fn().mockReturnValue({
    text: 'caption',
    locale: 'en-US',
    mentionsCompetitor: false,
    containsPricingData: false,
    containsLegalLanguage: false,
    containsComplianceTerms: false,
    targetsGovernmentSegment: false,
    containsReligiousOrPoliticalContent: false,
  }),
}));

vi.mock('@/lib/ai-cmo/quality/quality-evaluator', () => ({
  qualityEvaluator: {
    evaluate: vi.fn().mockResolvedValue({
      dimensions: {
        accuracy: 0.92,
        brandAlignment: 0.91,
        localization: 0.9,
        uniqueness: 0.88,
        eeat: 0.87,
        engagement: 0.9,
        platformCompliance: 0.93,
        safety: 0.95,
      },
      overallScore: 0.91,
      hallucinationFlag: false,
      autoRejected: false,
      rejectionReasons: [],
      requiresRevision: false,
      shouldPublish: true,
      evaluatorModel: 'smoke-test',
    }),
  },
}));

const { secureSyncToSoR, securePatchSoR } = vi.hoisted(() => ({
  secureSyncToSoR: vi.fn().mockResolvedValue({ ok: true, id: 'rec-smoke' }),
  securePatchSoR: vi.fn().mockResolvedValue({ ok: true, id: 'rec-smoke' }),
}));

vi.mock('@/lib/ai-cmo/utils/secure-reconciler-writer', () => ({
  secureSyncToSoR: (...args: unknown[]) => secureSyncToSoR(...args),
  securePatchSoR: (...args: unknown[]) => securePatchSoR(...args),
}));

vi.mock('@/lib/ai-cmo/campaign-service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/ai-cmo/campaign-service')>();
  return {
    ...actual,
    createCampaignViaReconciler: vi.fn().mockImplementation(async (input) => {
      await secureSyncToSoR({
        table: 'ai_cmo_campaigns',
        workspaceId: input.workspaceId,
        userId: input.userId,
        auditAction: 'ai_cmo.campaign.created',
        data: {
          workspace_id: input.workspaceId,
          name: input.name,
          brand_id: input.brandId ?? null,
          objective: input.objective,
          status: 'planning',
        },
      });
      return { ok: true, id: 'camp-smoke-1' };
    }),
    persistContentPieceViaReconciler: vi.fn().mockImplementation(async (input) => {
      await secureSyncToSoR({
        table: 'ai_cmo_content_pieces',
        workspaceId: input.workspaceId,
        userId: input.userId,
        auditAction: 'ai_cmo.content_piece.created',
        data: {
          workspace_id: input.workspaceId,
          campaign_id: input.campaignId,
          locale: input.content.locale,
          content: input.content,
        },
      });
      return { ok: true, id: 'piece-smoke-1' };
    }),
    persistLlmJudgeEvaluationViaReconciler: vi.fn().mockImplementation(async (input) => {
      await secureSyncToSoR({
        table: 'ai_cmo_evaluations',
        workspaceId: input.workspaceId,
        userId: input.userId,
        auditAction: 'ai_cmo.evaluation.llm_judge',
        data: {
          workspace_id: input.workspaceId,
          content_id: input.contentId,
          evaluator_type: 'llm_as_judge',
          overall_quality_score: input.evaluation.overallScore,
          hallucination_flag: input.evaluation.hallucinationFlag,
        },
      });
      return { ok: true, id: 'eval-smoke-1' };
    }),
    updateCampaignConfidenceViaReconciler: vi.fn().mockResolvedValue({ ok: true, id: 'camp-smoke-1' }),
  };
});

vi.mock('@/lib/ai-cmo/services/campaign-post-linker', () => ({
  linkCampaignPostViaReconciler: vi.fn().mockResolvedValue({
    ok: true,
    postId: 'post-smoke-1',
    campaignId: 'camp-smoke-1',
  }),
}));

vi.mock('@/lib/governance/approval-service', () => ({
  approvalService: {
    createApprovalRequest: vi.fn().mockResolvedValue({ ok: true, id: 'appr-smoke' }),
  },
}));

vi.mock('@/lib/ai-cmo/quality/uniqueness-guard', () => ({
  checkContentUniqueness: vi.fn().mockResolvedValue({
    isUnique: true,
    similarityScore: 0.2,
    source: 'none',
    checkedAgainst: 0,
  }),
}));

vi.mock('@/lib/orchestration/inngest-client', () => ({
  sendAiCmoInngestEvent: vi.fn().mockResolvedValue({ ids: ['evt-smoke-complete'] }),
}));

import { planCampaignStrategy } from '@/lib/ai-cmo/strategic-brain';
import { generateCampaignContent } from '@/lib/ai-cmo/creator-agent';

describe('E2E campaign workflow smoke', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const fixtures = createCampaignSmokeFixtures();
    vi.mocked(planCampaignStrategy).mockResolvedValue(fixtures.plan);
    vi.mocked(generateCampaignContent).mockResolvedValue(fixtures.content);
  });

  it('traverses full workflow and persists via secureSyncToSoR', async () => {
    const steps: string[] = [];
    const step = {
      run: async <T>(id: string, fn: () => Promise<T>) => {
        steps.push(id);
        return fn();
      },
    };

    const fixtures = createCampaignSmokeFixtures();
    const result = await executeCampaignWorkflowSteps(fixtures.payload, step);

    expect(result.status).toBe('published');
    expect(result.campaignId).toBe('camp-smoke-1');
    expect(result.contentId).toBe('piece-smoke-1');
    expect(result.postId).toBe('post-smoke-1');

    expect(steps).toEqual([
      'finops-preflight',
      'plan',
      'retrieve-memory',
      'generate',
      'check-uniqueness',
      'structured-policy-review',
      'evaluate',
      'persist',
      'link-post',
    ]);

    expect(secureSyncToSoR).toHaveBeenCalled();
    const tables = secureSyncToSoR.mock.calls.map((call) => (call[0] as { table: string }).table);
    expect(tables).toContain('ai_cmo_campaigns');
    expect(tables).toContain('ai_cmo_content_pieces');
    expect(tables).toContain('ai_cmo_evaluations');

    const campaignWrite = secureSyncToSoR.mock.calls.find(
      (call) => (call[0] as { table: string }).table === 'ai_cmo_campaigns',
    );
    expect(campaignWrite?.[0]).toMatchObject({
      auditAction: 'ai_cmo.campaign.created',
      workspaceId: WORKSPACE_ID,
    });
  });
});
