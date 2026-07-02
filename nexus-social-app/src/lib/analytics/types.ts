import type { PublishPlatform } from '@/lib/publishers/types';

export type AnalyticsPlatform = PublishPlatform;

export type PostMetrics = {
  impressions?: number;
  reach?: number;
  clicks?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  engagementRate?: number;
  rawPayload?: Record<string, unknown>;
};

export type InsightsFetchArgs = {
  externalPostId: string;
  accessToken: string;
  accountId?: string;
};

export interface InsightsFetcher {
  readonly platform: AnalyticsPlatform;
  fetchInsights(args: InsightsFetchArgs): Promise<PostMetrics>;
}

export function computeEngagementRate(metrics: PostMetrics): number | undefined {
  const engagement =
    (metrics.likes ?? 0) +
    (metrics.comments ?? 0) +
    (metrics.shares ?? 0) +
    (metrics.saves ?? 0);
  const reach = metrics.reach ?? metrics.impressions;
  if (!reach || reach <= 0) return undefined;
  return Number(((engagement / reach) * 100).toFixed(4));
}
