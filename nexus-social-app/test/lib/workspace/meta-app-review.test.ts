import { describe, expect, it } from 'vitest';
import { metaAppReviewUtils } from '@/lib/workspace/meta-app-review';

describe('metaAppReviewUtils', () => {
  it('identifies Meta platforms', () => {
    expect(metaAppReviewUtils.isMetaPlatform('facebook')).toBe(true);
    expect(metaAppReviewUtils.isMetaPlatform('Instagram')).toBe(true);
    expect(metaAppReviewUtils.isMetaPlatform('linkedin')).toBe(false);
  });

  it('blocks publish until approved', () => {
    expect(metaAppReviewUtils.canPublishToMeta('pending')).toBe(false);
    expect(metaAppReviewUtils.canPublishToMeta('rejected')).toBe(false);
    expect(metaAppReviewUtils.canPublishToMeta('approved')).toBe(true);
    expect(metaAppReviewUtils.canPublishToMeta(undefined)).toBe(false);
  });

  it('returns user-facing status labels', () => {
    expect(metaAppReviewUtils.statusLabel('pending')).toContain('Pending Meta App Review');
    expect(metaAppReviewUtils.statusLabel('approved')).toContain('ready to publish');
  });
});
