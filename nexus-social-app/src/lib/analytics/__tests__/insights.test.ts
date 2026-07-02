import { afterEach, describe, expect, it, vi } from 'vitest';
import { metaInsightsUtils } from '../meta-insights';
import { linkedinInsightsUtils } from '../linkedin-insights';
import { xInsightsUtils } from '../x-insights';

describe('meta-insights', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parseMetaInsightsResponse maps Graph insight rows', () => {
    const metrics = metaInsightsUtils.parseMetaInsightsResponse({
      data: [
        { name: 'post_impressions', values: [{ value: 1200 }] },
        { name: 'post_impressions_unique', values: [{ value: 900 }] },
        { name: 'post_clicks', values: [{ value: 45 }] },
        { name: 'post_reactions_by_type_total', values: [{ value: { like: 10, love: 2 } }] },
        { name: 'post_comments', values: [{ value: 3 }] },
        { name: 'post_shares', values: [{ value: 1 }] },
      ],
    });

    expect(metrics.impressions).toBe(1200);
    expect(metrics.reach).toBe(900);
    expect(metrics.clicks).toBe(45);
    expect(metrics.likes).toBe(12);
    expect(metrics.comments).toBe(3);
    expect(metrics.shares).toBe(1);
    expect(metrics.engagementRate).toBeCloseTo(1.7778, 3);
  });

  it('surfaces Graph API errors from fetch', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: 'Invalid OAuth access token' } }),
      }),
    );

    await expect(
      metaInsightsUtils.graphGetInsights('post-1', 'bad-token', ['post_impressions']),
    ).rejects.toThrow('Invalid OAuth access token');
  });
});

describe('linkedin-insights', () => {
  it('parseLinkedInInsightsResponse maps share statistics', () => {
    const metrics = linkedinInsightsUtils.parseLinkedInInsightsResponse({
      totalShareStatistics: {
        impressionCount: 500,
        uniqueImpressionsCount: 420,
        clickCount: 12,
        likeCount: 30,
        commentCount: 4,
        shareCount: 2,
      },
    });

    expect(metrics.impressions).toBe(500);
    expect(metrics.reach).toBe(420);
    expect(metrics.likes).toBe(30);
    expect(metrics.engagementRate).toBeCloseTo(8.5714, 3);
  });

  it('parseLinkedInInsightsResponse maps organizationalEntityShareStatistics elements', () => {
    const metrics = linkedinInsightsUtils.parseLinkedInInsightsResponse({
      elements: [
        {
          totalShareStatistics: {
            impressionCount: 100,
            likeCount: 5,
          },
        },
      ],
    });

    expect(metrics.impressions).toBe(100);
    expect(metrics.likes).toBe(5);
  });
});

describe('x-insights', () => {
  it('parseXInsightsResponse maps public_metrics', () => {
    const metrics = xInsightsUtils.parseXInsightsResponse({
      data: {
        public_metrics: {
          impression_count: 800,
          like_count: 20,
          reply_count: 5,
          retweet_count: 3,
          quote_count: 1,
        },
      },
    });

    expect(metrics.impressions).toBe(800);
    expect(metrics.likes).toBe(20);
    expect(metrics.comments).toBe(5);
    expect(metrics.shares).toBe(4);
    expect(metrics.engagementRate).toBeCloseTo(3.625, 3);
  });
});
