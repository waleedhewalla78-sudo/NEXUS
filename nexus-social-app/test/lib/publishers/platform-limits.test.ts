import { describe, expect, it } from 'vitest';
import { platformLimitsUtils } from '@/lib/publishers/platform-limits';

describe('platformLimitsUtils', () => {
  it('flags Twitter character overflow', () => {
    const errors = platformLimitsUtils.validatePlatforms({
      platforms: ['Twitter'],
      textLength: 300,
      mediaCount: 0,
    });
    expect(errors.some((e) => e.includes('280'))).toBe(true);
  });

  it('flags Instagram missing media', () => {
    const errors = platformLimitsUtils.validatePlatforms({
      platforms: ['Instagram'],
      textLength: 50,
      mediaCount: 0,
    });
    expect(errors.some((e) => e.includes('image'))).toBe(true);
  });

  it('passes valid LinkedIn post', () => {
    const errors = platformLimitsUtils.validatePlatforms({
      platforms: ['LinkedIn'],
      textLength: 200,
      mediaCount: 1,
    });
    expect(errors).toHaveLength(0);
  });
});
