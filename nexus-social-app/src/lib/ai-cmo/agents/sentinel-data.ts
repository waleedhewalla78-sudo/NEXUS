/**
 * Feature 004 Sprint 16 / Phase 6 — Sentinel time-series data + anomaly math.
 */

import { supabaseAdmin } from '@/lib/supabase/server';
import type { MetricAnomaly } from '@/lib/ai-cmo/agents/types/intelligence';

export type DailyMetricPoint = {
  date: string;
  impressions: number;
  engagement: number;
};

export type ActiveCampaignTarget = {
  workspaceId: string;
  campaignId: string;
};

export function computeMean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function computeStdDev(values: number[], mean?: number): number {
  if (values.length < 2) return 0;
  const avg = mean ?? computeMean(values);
  const variance = values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function detectAnomaliesFromSeries(
  metricName: string,
  series: DailyMetricPoint[],
  stdDevMultiplier = 2,
): MetricAnomaly[] {
  if (series.length < 3) return [];

  const values = series.map((p) => p.engagement);
  const mean = computeMean(values);
  const stdDev = computeStdDev(values, mean);
  const latest = series[series.length - 1]!;

  if (stdDev === 0) return [];

  const threshold = mean - stdDevMultiplier * stdDev;
  if (latest.engagement >= threshold) return [];

  const dropPct =
    mean > 0 ? Number((((mean - latest.engagement) / mean) * 100).toFixed(2)) : 0;

  return [
    {
      metric: metricName,
      currentValue: latest.engagement,
      baselineValue: mean,
      dropPct,
      detectedAt: new Date().toISOString(),
    },
  ];
}

export async function fetchPostAnalyticsSeries(
  workspaceId: string,
  days = 14,
): Promise<DailyMetricPoint[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceIso = since.toISOString();

  const { data: pieces } = await supabaseAdmin
    .from('ai_cmo_content_pieces')
    .select('post_id')
    .eq('workspace_id', workspaceId)
    .not('post_id', 'is', null);

  const postIds = (pieces ?? [])
    .map((p) => p.post_id)
    .filter((id): id is string => typeof id === 'string');

  if (!postIds.length) return [];

  const { data: analytics } = await supabaseAdmin
    .from('post_analytics')
    .select('post_id, impressions, engagement_rate, synced_at')
    .in('post_id', postIds)
    .gte('synced_at', sinceIso)
    .order('synced_at', { ascending: true });

  const byDay = new Map<string, { impressions: number; engagementSum: number; count: number }>();

  for (const row of analytics ?? []) {
    const day = String(row.synced_at ?? '').slice(0, 10);
    if (!day) continue;
    const bucket = byDay.get(day) ?? { impressions: 0, engagementSum: 0, count: 0 };
    bucket.impressions += Number(row.impressions ?? 0);
    bucket.engagementSum += Number(row.engagement_rate ?? 0);
    bucket.count += 1;
    byDay.set(day, bucket);
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, bucket]) => ({
      date,
      impressions: bucket.impressions,
      engagement: bucket.count > 0 ? bucket.engagementSum / bucket.count : 0,
    }));
}

export async function scanWorkspaceAnomalies(workspaceId: string): Promise<MetricAnomaly[]> {
  const series = await fetchPostAnalyticsSeries(workspaceId, 14);
  return detectAnomaliesFromSeries('engagement_rate', series);
}

export async function listActiveCampaignTargets(limit = 500): Promise<ActiveCampaignTarget[]> {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const { data, error } = await supabaseAdmin
    .from('ai_cmo_campaigns')
    .select('id, workspace_id, updated_at')
    .gte('updated_at', since.toISOString())
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error || !data?.length) return [];

  return data
    .filter((row) => row.workspace_id && row.id)
    .map((row) => ({
      workspaceId: String(row.workspace_id),
      campaignId: String(row.id),
    }));
}
