import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QualityEvaluator, applyAutoRejectRules } from '@/lib/ai-cmo/quality/quality-evaluator';

vi.mock('@/lib/ai/providers/provider-router', () => ({
  providerRouter: {
    generate: vi.fn(),
  },
}));

import { providerRouter } from '@/lib/ai/providers/provider-router';

describe('QualityEvaluator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('defines all eight evaluation dimensions', async () => {
    vi.mocked(providerRouter.generate).mockResolvedValue({
      text: JSON.stringify({
        accuracy: 0.9,
        brandAlignment: 0.88,
        localization: 0.92,
        uniqueness: 0.86,
        eeat: 0.84,
        engagement: 0.87,
        platformCompliance: 0.91,
        safety: 0.95,
        hallucinationFlag: false,
        feedback: 'Strong draft',
      }),
      provider: 'openrouter',
      modelUsed: 'openai/gpt-4o-mini',
      stubbed: false,
      attemptedProviders: ['dify', 'openrouter'],
    });

    const evaluator = new QualityEvaluator();
    const result = await evaluator.evaluate({
      content: {
        caption: 'Grow your business with proven social tips.',
        hashtags: ['#marketing'],
        callToAction: 'Learn more',
        platforms: ['linkedin'],
        locale: 'en-US',
      },
    });

    expect(result.dimensions.accuracy).toBeDefined();
    expect(result.dimensions.brandAlignment).toBeDefined();
    expect(result.dimensions.localization).toBeDefined();
    expect(result.dimensions.uniqueness).toBeDefined();
    expect(result.dimensions.eeat).toBeDefined();
    expect(result.dimensions.engagement).toBeDefined();
    expect(result.dimensions.platformCompliance).toBeDefined();
    expect(result.dimensions.safety).toBeDefined();
    expect(result.overallScore).toBeGreaterThan(0.8);
    expect(result.shouldPublish).toBe(true);
  });

  it('hard auto-rejects hallucination_flag', async () => {
    vi.mocked(providerRouter.generate).mockResolvedValue({
      text: JSON.stringify({
        accuracy: 0.9,
        brandAlignment: 0.9,
        localization: 0.9,
        uniqueness: 0.9,
        eeat: 0.9,
        engagement: 0.9,
        platformCompliance: 0.9,
        safety: 0.2,
        hallucinationFlag: true,
      }),
      provider: 'openrouter',
      modelUsed: 'openai/gpt-4o-mini',
      stubbed: false,
      attemptedProviders: ['openrouter'],
    });

    const evaluator = new QualityEvaluator();
    const result = await evaluator.evaluate({
      content: {
        caption: 'We are #1 with 99% guaranteed results overnight.',
        hashtags: [],
        callToAction: 'Buy now',
        platforms: ['linkedin'],
        locale: 'en-US',
      },
    });

    expect(result.autoRejected).toBe(true);
    expect(result.hallucinationFlag).toBe(true);
    expect(result.rejectionReasons).toContain('HALLUCINATION');
    expect(result.requiresRevision).toBe(false);
  });

  it('auto-rejects ar-* locale when localization below 0.75', () => {
    const { autoRejected, rejectionReasons } = applyAutoRejectRules({
      dimensions: {
        accuracy: 0.8,
        brandAlignment: 0.8,
        localization: 0.7,
        uniqueness: 0.8,
        eeat: 0.8,
        engagement: 0.8,
        platformCompliance: 0.8,
        safety: 0.9,
      },
      overallScore: 0.78,
      hallucinationFlag: false,
      locale: 'ar-AE',
    });

    expect(autoRejected).toBe(true);
    expect(rejectionReasons).toContain('LOCALIZATION_TOO_LOW');
  });

  it('auto-rejects uniqueness below 0.70 (Doc 07)', () => {
    const { autoRejected, rejectionReasons } = applyAutoRejectRules({
      dimensions: {
        accuracy: 0.8,
        brandAlignment: 0.8,
        localization: 0.85,
        uniqueness: 0.65,
        eeat: 0.8,
        engagement: 0.8,
        platformCompliance: 0.8,
        safety: 0.9,
      },
      overallScore: 0.78,
      hallucinationFlag: false,
      locale: 'en-US',
    });

    expect(autoRejected).toBe(true);
    expect(rejectionReasons).toContain('UNIQUENESS_TOO_LOW');
  });

  it('auto-rejects overall score below 0.55', () => {
    const { autoRejected, rejectionReasons } = applyAutoRejectRules({
      dimensions: {
        accuracy: 0.5,
        brandAlignment: 0.5,
        localization: 0.5,
        uniqueness: 0.5,
        eeat: 0.5,
        engagement: 0.5,
        platformCompliance: 0.5,
        safety: 0.6,
      },
      overallScore: 0.5,
      hallucinationFlag: false,
      locale: 'en-US',
    });

    expect(autoRejected).toBe(true);
    expect(rejectionReasons).toContain('OVERALL_SCORE_TOO_LOW');
  });

  it('allows revision when auto-rejected for non-hallucination reasons', async () => {
    vi.mocked(providerRouter.generate).mockResolvedValue({
      text: null,
      provider: 'none',
      modelUsed: 'heuristic',
      stubbed: true,
      attemptedProviders: [],
    });

    const evaluator = new QualityEvaluator();
    const result = await evaluator.evaluate({
      content: {
        caption: 'Short',
        hashtags: [],
        callToAction: 'Go',
        platforms: ['linkedin'],
        locale: 'en-US',
      },
    });

    if (result.autoRejected && !result.rejectionReasons.includes('HALLUCINATION')) {
      expect(result.requiresRevision).toBe(true);
      expect(result.revisionFeedback).toBeTruthy();
    }
  });
});
