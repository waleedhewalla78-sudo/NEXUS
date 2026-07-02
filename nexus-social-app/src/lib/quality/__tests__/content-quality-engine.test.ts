import { describe, expect, it } from 'vitest';
import { ContentQualityEngine } from '@/lib/quality/content-quality-engine';

describe('ContentQualityEngine', () => {
  const engine = new ContentQualityEngine();

  it('rejects thin duplicate content', () => {
    const corpus = ['Our product helps teams schedule social posts efficiently every week.'];
    const score = engine.evaluate({
      text: 'Our product helps teams schedule social posts efficiently every week.',
      existingCorpus: corpus,
      keyword: 'social posts',
    });
    expect(score.uniqueness).toBeLessThan(0.75);
    expect(engine.shouldPublish(score)).toBe(false);
  });

  it('approves rich unique helpful content', () => {
    const score = engine.evaluate({
      text:
        'How to improve engagement: our team analyzed 500 posts and found that questions drive 2x comments. ' +
        'Here is a step-by-step guide with examples because authentic stories outperform generic promos. ' +
        'According to recent research, helpful tips with clear benefits perform best.',
      existingCorpus: ['Unrelated legacy blog about payroll software integrations.'],
      keyword: 'engagement',
    });
    expect(engine.shouldPublish(score)).toBe(true);
    expect(score.overallScore).toBeGreaterThanOrEqual(0.8);
  });

  it('flags keyword cannibalization above threshold', () => {
    const score = engine.evaluate({
      text: 'A guide to social posts for agencies with tips and examples.',
      existingCorpus: [
        'social posts for agencies part 1',
        'social posts for agencies part 2',
        'social posts for agencies part 3',
      ],
      keyword: 'social posts',
    });
    expect(score.keywordCannibalization).toBeGreaterThan(0.3);
    expect(engine.shouldPublish(score)).toBe(false);
  });

  it('auto-rejects extremely low quality content', () => {
    const score = engine.evaluate({
      text: 'bad',
      existingCorpus: ['bad'],
      keyword: 'bad',
    });
    expect(engine.shouldAutoReject(score)).toBe(true);
    expect(engine.getRejectReasons(score).length).toBeGreaterThan(0);
  });
});
