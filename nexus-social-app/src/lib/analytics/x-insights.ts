import type { InsightsFetcher, InsightsFetchArgs, PostMetrics } from './types';
import { computeEngagementRate } from './types';

type XPublicMetrics = {
  retweet_count?: number;
  reply_count?: number;
  like_count?: number;
  quote_count?: number;
  impression_count?: number;
};

type XTweetResponse = {
  data?: { public_metrics?: XPublicMetrics };
  errors?: { detail?: string }[];
};

export function parseXInsightsResponse(payload: XTweetResponse): PostMetrics {
  const publicMetrics = payload.data?.public_metrics ?? {};
  const metrics: PostMetrics = {
    impressions: publicMetrics.impression_count,
    reach: publicMetrics.impression_count,
    likes: publicMetrics.like_count,
    comments: publicMetrics.reply_count,
    shares: (publicMetrics.retweet_count ?? 0) + (publicMetrics.quote_count ?? 0),
    rawPayload: payload as Record<string, unknown>,
  };
  metrics.engagementRate = computeEngagementRate(metrics);
  return metrics;
}

class XInsightsFetcher implements InsightsFetcher {
  readonly platform = 'x' as const;

  async fetchInsights({ externalPostId, accessToken }: InsightsFetchArgs): Promise<PostMetrics> {
    const url =
      `https://api.twitter.com/2/tweets/${encodeURIComponent(externalPostId)}` +
      '?tweet.fields=public_metrics';
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const json = (await response.json()) as XTweetResponse;
    if (!response.ok) {
      throw new Error(json.errors?.[0]?.detail ?? `X insights failed: HTTP ${response.status}`);
    }
    return parseXInsightsResponse(json);
  }
}

export const xInsightsFetcher = new XInsightsFetcher();

export const xInsightsUtils = {
  parseXInsightsResponse,
};
