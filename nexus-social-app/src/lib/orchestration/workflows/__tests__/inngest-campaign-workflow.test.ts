import { describe, expect, it, vi } from 'vitest';
import { executeCampaignWorkflowSteps } from '@/lib/orchestration/workflows/inngest-campaign-workflow';
import { createPassthroughStepRunner } from '@/lib/orchestration/types/campaign-workflow';

vi.mock('@/lib/orchestration/campaign-workflow-deps', () => ({
  buildCampaignWorkflowDeps: vi.fn(() => ({
    deps: {
      finopsPreflight: vi.fn().mockResolvedValue({ allowed: true, spendUsd: 0, capUsd: 100 }),
      planCampaign: vi.fn().mockResolvedValue({ plan: { objective: 'Grow' }, objective: 'Grow' }),
      retrieveMemory: vi.fn().mockResolvedValue([]),
      generateContent: vi.fn().mockResolvedValue({
        content: { caption: 'Hi', platforms: ['linkedin'], hashtags: [], callToAction: 'Go', locale: 'en-US', draftMetadata: {} },
        plan: { objective: 'Grow', keyMessages: ['Grow'] },
        quality: { overallScore: 0.9 },
        confidence: 0.9,
      }),
      checkContentUniqueness: vi.fn().mockResolvedValue({
        isUnique: true,
        similarityScore: 0.2,
        source: 'none',
        checkedAgainst: 0,
      }),
      reviseContent: vi.fn().mockResolvedValue({
        content: { caption: 'Revised Hi', platforms: ['linkedin'], hashtags: [], callToAction: 'Go', locale: 'en-US', draftMetadata: {} },
        plan: { objective: 'Grow', keyMessages: ['Grow'] },
        quality: { overallScore: 0.92 },
        confidence: 0.92,
      }),
      structuredPolicyReview: vi.fn().mockResolvedValue({
        approved: true,
        riskTier: 'LOW',
        reason: 'Approved',
        violations: [],
        requiresApproval: false,
      }),
      runQualityEvaluation: vi
        .fn()
        .mockResolvedValueOnce({
          dimensions: { accuracy: 0.6, brandAlignment: 0.6, localization: 0.6, uniqueness: 0.6, eeat: 0.6, engagement: 0.6, platformCompliance: 0.6, safety: 0.8 },
          overallScore: 0.6,
          hallucinationFlag: false,
          autoRejected: true,
          rejectionReasons: ['OVERALL_SCORE_TOO_LOW'],
          requiresRevision: true,
          revisionFeedback: 'Improve clarity',
          shouldPublish: false,
          evaluatorModel: 'test',
        })
        .mockResolvedValueOnce({
          dimensions: { accuracy: 0.9, brandAlignment: 0.9, localization: 0.9, uniqueness: 0.9, eeat: 0.9, engagement: 0.9, platformCompliance: 0.9, safety: 0.95 },
          overallScore: 0.9,
          hallucinationFlag: false,
          autoRejected: false,
          rejectionReasons: [],
          requiresRevision: false,
          shouldPublish: true,
          evaluatorModel: 'test',
        }),
      persistQualityEvaluation: vi.fn().mockResolvedValue({ evaluationId: 'eval-1', contentId: 'piece-1' }),
      syncToSoR: vi.fn().mockResolvedValue(undefined),
      routeToApproval: vi.fn().mockResolvedValue(undefined),
    },
    getIds: () => ({ campaignId: 'camp-1', contentId: 'piece-1' }),
  })),
}));

vi.mock('@/lib/ai-cmo/services/campaign-post-linker', () => ({
  linkCampaignPostViaReconciler: vi.fn().mockResolvedValue({
    ok: true,
    postId: 'post-1',
    campaignId: 'camp-1',
  }),
}));

vi.mock('@/lib/orchestration/inngest-client', () => ({
  sendAiCmoInngestEvent: vi.fn().mockResolvedValue({ ids: ['evt-1'] }),
}));

describe('inngest campaign workflow', () => {
  it('runs evaluate → revise-content → evaluate-retry when revision required', async () => {
    const steps: string[] = [];
    const step = {
      run: async <T>(id: string, fn: () => Promise<T>) => {
        steps.push(id);
        return fn();
      },
    };

    const result = await executeCampaignWorkflowSteps(
      {
        jobId: '550e8400-e29b-41d4-a716-446655440001',
        workspaceId: '550e8400-e29b-41d4-a716-446655440000',
        userId: 'user-1',
        objective: 'Grow signups',
        locale: 'en-US',
        persona: 'operator',
        idempotencyKey: 'idem-key-12345678',
        requestedAt: new Date().toISOString(),
      },
      step,
    );

    expect(result.status).toBe('published');
    expect(steps).toContain('evaluate');
    expect(steps).toContain('revise-content');
    expect(steps).toContain('evaluate-retry');
    expect(steps).toContain('persist');
  });

  it('passthrough step runner executes without Inngest package', async () => {
    const runner = createPassthroughStepRunner();
    const value = await runner.run('test-step', async () => 42);
    expect(value).toBe(42);
  });
});
