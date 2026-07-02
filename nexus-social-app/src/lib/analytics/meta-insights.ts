import type { InsightsFetcher, InsightsFetchArgs, PostMetrics } from './types';
import { computeEngagementRate } from './types';

const GRAPH_VERSION = process.env.FACEBOOK_GRAPH_API_VERSION ?? 'v21.0';

type InsightValue = { value?: number | string | Record<string, number> };
type InsightRow = { name?: string; values?: InsightValue[] };

type GraphInsightsResponse = {
  data?: InsightRow[];
  error?: { message?: string };
};

function readMetric(rows: InsightRow[] | undefined, name: string): number | undefined {
  const row = rows?.find((entry) => entry.name === name);
  const raw = row?.values?.[0]?.value;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if (raw && typeof raw === 'object') {
    return Object.values(raw).reduce((sum, value) => sum + (Number(value) || 0), 0);
  }
  return undefined;
}

export function parseMetaInsightsResponse(payload: GraphInsightsResponse): PostMetrics {
  const rows = payload.data ?? [];
  const likes = readMetric(rows, 'post_reactions_by_type_total');
  const metrics: PostMetrics = {
    impressions: readMetric(rows, 'post_impressions'),
    reach: readMetric(rows, 'post_impressions_unique'),
    clicks: readMetric(rows, 'post_clicks'),
    likes,
    comments: readMetric(rows, 'post_comments'),
    shares: readMetric(rows, 'post_shares'),
    rawPayload: payload as Record<string, unknown>,
  };
  metrics.engagementRate = computeEngagementRate(metrics);
  return metrics;
}

async function graphGetInsights(
  externalPostId: string,
  accessToken: string,
  metrics: string[],
): Promise<GraphInsightsResponse> {
  const metricParam = metrics.join(',');
  const url =
    `https://graph.facebook.com/${GRAPH_VERSION}/${externalPostId}/insights` +
    `?metric=${encodeURIComponent(metricParam)}&access_token=${encodeURIComponent(accessToken)}`;
  const response = await fetch(url);
  const json = (await response.json()) as GraphInsightsResponse;
  if (!response.ok) {
    throw new Error(json.error?.message ?? `Graph Insights failed: HTTP ${response.status}`);
  }
  return json;
}

class MetaInsightsFetcher implements InsightsFetcher {
  readonly platform = 'facebook' as const;

  async fetchInsights({ externalPostId, accessToken }: InsightsFetchArgs): Promise<PostMetrics> {
    const payload = await graphGetInsights(externalPostId, accessToken, [
      'post_impressions',
      'post_impressions_unique',
      'post_clicks',
      'post_reactions_by_type_total',
      'post_comments',
      'post_shares',
    ]);
    return parseMetaInsightsResponse(payload);
  }
}

class InstagramInsightsFetcher implements InsightsFetcher {
  readonly platform = 'instagram' as const;

  async fetchInsights({ externalPostId, accessToken }: InsightsFetchArgs): Promise<PostMetrics> {
    const payload = await graphGetInsights(externalPostId, accessToken, [
      'impressions',
      'reach',
      'likes',
      'comments',
      'shares',
      'saved',
    ]);
    const rows = payload.data ?? [];
    const metrics: PostMetrics = {
      impressions: readMetric(rows, 'impressions'),
      reach: readMetric(rows, 'reach'),
      likes: readMetric(rows, 'likes'),
      comments: readMetric(rows, 'comments'),
      shares: readMetric(rows, 'shares'),
      saves: readMetric(rows, 'saved'),
      rawPayload: payload as Record<string, unknown>,
    };
    metrics.engagementRate = computeEngagementRate(metrics);
    return metrics;
  }
}

export const metaInsightsFetcher = new MetaInsightsFetcher();
export const instagramInsightsFetcher = new InstagramInsightsFetcher();

export const metaInsightsUtils = {
  parseMetaInsightsResponse,
  readMetric,
  graphGetInsights,
};
