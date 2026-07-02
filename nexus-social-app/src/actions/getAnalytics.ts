// src/actions/getAnalytics.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export interface EngagementMetrics {
  totalImpressions: number;
  totalReach: number;
  totalEngagement: number;
  byPlatform: { platform: string; impressions: number; engagement: number }[];
  overTime: { date: string; impressions: number; engagement: number }[];
}

export interface AnalyticsResult {
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  postsByPlatform: { platform: string; count: number }[];
  postsOverTime: { date: string; count: number }[];
  engagement?: EngagementMetrics;
  predictions?: {
    optimalTimes: string[];
    churnScore: number;
  };
}

export const EMPTY_ANALYTICS: AnalyticsResult = {
  totalPosts: 0,
  publishedPosts: 0,
  draftPosts: 0,
  postsByPlatform: [],
  postsOverTime: [],
  engagement: {
    totalImpressions: 0,
    totalReach: 0,
    totalEngagement: 0,
    byPlatform: [],
    overTime: [],
  },
};

export const DEMO_ANALYTICS: AnalyticsResult = {
  totalPosts: 128,
  publishedPosts: 96,
  draftPosts: 32,
  postsByPlatform: [
    { platform: 'Twitter', count: 42 },
    { platform: 'Instagram', count: 35 },
    { platform: 'LinkedIn', count: 28 },
    { platform: 'Facebook', count: 23 },
  ],
  postsOverTime: [
    { date: '2026-05-19', count: 4 },
    { date: '2026-05-20', count: 7 },
    { date: '2026-05-21', count: 5 },
    { date: '2026-05-22', count: 9 },
    { date: '2026-05-23', count: 6 },
    { date: '2026-05-24', count: 3 },
    { date: '2026-05-25', count: 8 },
    { date: '2026-05-26', count: 11 },
    { date: '2026-05-27', count: 7 },
    { date: '2026-05-28', count: 10 },
    { date: '2026-05-29', count: 6 },
    { date: '2026-05-30', count: 12 },
    { date: '2026-05-31', count: 5 },
    { date: '2026-06-01', count: 9 },
    { date: '2026-06-02', count: 4 },
    { date: '2026-06-03', count: 8 },
    { date: '2026-06-04', count: 7 },
    { date: '2026-06-05', count: 6 },
    { date: '2026-06-06', count: 11 },
    { date: '2026-06-07', count: 3 },
    { date: '2026-06-08', count: 10 },
    { date: '2026-06-09', count: 8 },
    { date: '2026-06-10', count: 5 },
    { date: '2026-06-11', count: 9 },
    { date: '2026-06-12', count: 7 },
    { date: '2026-06-13', count: 4 },
    { date: '2026-06-14', count: 6 },
    { date: '2026-06-15', count: 12 },
    { date: '2026-06-16', count: 8 },
    { date: '2026-06-17', count: 5 },
  ],
  engagement: {
    totalImpressions: 45200,
    totalReach: 38100,
    totalEngagement: 2840,
    byPlatform: [
      { platform: 'Twitter', impressions: 18000, engagement: 920 },
      { platform: 'Instagram', impressions: 14200, engagement: 1100 },
      { platform: 'LinkedIn', impressions: 8000, engagement: 520 },
      { platform: 'Facebook', impressions: 5000, engagement: 300 },
    ],
    overTime: [
      { date: '2026-06-10', impressions: 1200, engagement: 80 },
      { date: '2026-06-11', impressions: 1500, engagement: 95 },
      { date: '2026-06-12', impressions: 980, engagement: 62 },
    ],
  },
  predictions: {
    optimalTimes: ['09:00', '13:00', '18:00'],
    churnScore: 12,
  },
};

function isDemoAnalyticsAllowed(): boolean {
  return (
    process.env.NODE_ENV === 'development' &&
    (process.env.DEMO_ANALYTICS_ENABLED ?? 'false').toLowerCase() === 'true'
  );
}

function mapEngagement(row: Record<string, unknown>): EngagementMetrics {
  return {
    totalImpressions: Number(row.total_impressions ?? 0),
    totalReach: Number(row.total_reach ?? 0),
    totalEngagement: Number(row.total_engagement ?? 0),
    byPlatform: Array.isArray(row.engagement_by_platform) ? row.engagement_by_platform : [],
    overTime: Array.isArray(row.engagement_over_time) ? row.engagement_over_time : [],
  };
}

/**
 * Fetch analytics for a workspace.
 * Demo fallback only when NODE_ENV=development AND DEMO_ANALYTICS_ENABLED=true.
 */
export async function getAnalytics({
  workspaceId,
  userId,
}: {
  workspaceId: string;
  userId: string;
}): Promise<AnalyticsResult> {
  const isProduction = process.env.NODE_ENV === 'production';
  const demoAllowed = isDemoAnalyticsAllowed();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  if (!url || url.includes('your-supabase-url')) {
    if (isProduction) throw new Error('Supabase URL not configured');
    if (demoAllowed) {
      console.warn('[Analytics] Supabase URL not configured – using demo data');
      return DEMO_ANALYTICS;
    }
    return EMPTY_ANALYTICS;
  }

  try {
    const { data: membership, error: memErr } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .single();

    if (memErr || !membership) {
      if (isProduction) throw new Error('Unauthorized workspace access');
      if (demoAllowed) {
        console.warn('[Analytics] User not a workspace member – using demo data');
        return DEMO_ANALYTICS;
      }
      return EMPTY_ANALYTICS;
    }

    const { data, error } = await supabase.rpc('get_workspace_analytics', {
      p_workspace_id: workspaceId,
    });

    if (error || !data || !data[0]) {
      if (isProduction) throw new Error(error?.message ?? 'Analytics RPC returned no data');
      if (demoAllowed) {
        console.warn('[Analytics] RPC error or empty result – using demo data', error);
        return DEMO_ANALYTICS;
      }
      return EMPTY_ANALYTICS;
    }

    const row = data[0] as Record<string, unknown>;
    const result: AnalyticsResult = {
      totalPosts: Number(row.total_posts ?? 0),
      publishedPosts: Number(row.published_posts ?? 0),
      draftPosts: Number(row.draft_posts ?? 0),
      postsByPlatform: Array.isArray(row.posts_by_platform) ? row.posts_by_platform : [],
      postsOverTime: Array.isArray(row.posts_over_time) ? row.posts_over_time : [],
      engagement: mapEngagement(row),
    };

    const { data: predictionData } = await supabase
      .from('predictions')
      .select('optimal_times, churn_score')
      .eq('workspace_id', workspaceId)
      .single();

    if (predictionData) {
      result.predictions = {
        optimalTimes: predictionData.optimal_times || [],
        churnScore: Number(predictionData.churn_score || 0),
      };
    }

    return result;
  } catch (err) {
    if (isProduction) throw err;
    if (demoAllowed) {
      console.warn('[Analytics] Unexpected error – using demo data', err);
      return DEMO_ANALYTICS;
    }
    throw err;
  }
}
