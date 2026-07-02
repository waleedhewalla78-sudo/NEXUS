import type { InsightsFetcher, InsightsFetchArgs, PostMetrics } from './types';
import { computeEngagementRate } from './types';

type LinkedInShareStatistics = {
  shareCount?: number;
  likeCount?: number;
  commentCount?: number;
  clickCount?: number;
  impressionCount?: number;
  uniqueImpressionsCount?: number;
};

type LinkedInSocialMetadata = {
  totalShareStatistics?: LinkedInShareStatistics;
  elements?: Array<{ totalShareStatistics?: LinkedInShareStatistics }>;
};

export function parseLinkedInInsightsResponse(payload: LinkedInSocialMetadata): PostMetrics {
  const stats =
    payload.totalShareStatistics ?? payload.elements?.[0]?.totalShareStatistics ?? {};
  const metrics: PostMetrics = {
    impressions: stats.impressionCount,
    reach: stats.uniqueImpressionsCount,
    clicks: stats.clickCount,
    likes: stats.likeCount,
    comments: stats.commentCount,
    shares: stats.shareCount,
    rawPayload: payload as Record<string, unknown>,
  };
  metrics.engagementRate = computeEngagementRate(metrics);
  return metrics;
}

class LinkedInInsightsFetcher implements InsightsFetcher {
  readonly platform = 'linkedin' as const;

  async fetchInsights({
    externalPostId,
    accessToken,
    accountId,
  }: InsightsFetchArgs): Promise<PostMetrics> {
    if (!accountId) {
      throw new Error('LinkedIn insights require a connected organization account ID');
    }
    const orgUrn = accountId.startsWith('urn:')
      ? accountId
      : `urn:li:organization:${accountId}`;
    const params = new URLSearchParams();
    params.set('q', 'organizationalEntity');
    params.set('organizationalEntity', orgUrn);
    params.append('shares[0]', externalPostId);
    const url = `https://api.linkedin.com/v2/organizationalEntityShareStatistics?${params.toString()}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
      },
    });
    const json = (await response.json()) as LinkedInSocialMetadata & { message?: string };
    if (!response.ok) {
      throw new Error(json.message ?? `LinkedIn insights failed: HTTP ${response.status}`);
    }
    return parseLinkedInInsightsResponse(json);
  }
}

export const linkedinInsightsFetcher = new LinkedInInsightsFetcher();

export const linkedinInsightsUtils = {
  parseLinkedInInsightsResponse,
};
