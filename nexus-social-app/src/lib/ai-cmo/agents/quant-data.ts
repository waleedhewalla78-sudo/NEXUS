/**
 * Feature 004 Sprint 16 — Quant agent analytics aggregation (read-only).
 */

import { supabaseAdmin } from '@/lib/supabase/server';

export type HourlyAnalyticsBucket = {
  hour: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
};

export type DailyAnalyticsBucket = {
  date: string;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
};

export type QuantTimeSeries = {
  workspaceId: string;
  periodDays: number;
  hourly: HourlyAnalyticsBucket[];
  daily: DailyAnalyticsBucket[];
  totals: {
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
  };
};

export async function fetchQuantTimeSeries(
  workspaceId: string,
  periodDays = 7,
): Promise<QuantTimeSeries> {
  const since = new Date();
  since.setDate(since.getDate() - periodDays);
  const sinceIso = since.toISOString();

  const { data: pieces } = await supabaseAdmin
    .from('ai_cmo_content_pieces')
    .select('post_id')
    .eq('workspace_id', workspaceId)
    .not('post_id', 'is', null);

  const postIds = (pieces ?? [])
    .map((p) => p.post_id)
    .filter((id): id is string => typeof id === 'string');

  if (!postIds.length) {
    return {
      workspaceId,
      periodDays,
      hourly: [],
      daily: [],
      totals: { impressions: 0, clicks: 0, conversions: 0, ctr: 0 },
    };
  }

  const { data: rows } = await supabaseAdmin
    .from('post_analytics')
    .select('impressions, clicks, conversions, synced_at')
    .in('post_id', postIds)
    .gte('synced_at', sinceIso);

  const hourlyMap = new Map<number, { impressions: number; clicks: number; conversions: number }>();
  const dailyMap = new Map<string, { impressions: number; clicks: number; conversions: number }>();

  let totalImpressions = 0;
  let totalClicks = 0;
  let totalConversions = 0;

  for (const row of rows ?? []) {
    const impressions = Number(row.impressions ?? 0);
    const clicks = Number(row.clicks ?? 0);
    const conversions = Number(row.conversions ?? 0);
    totalImpressions += impressions;
    totalClicks += clicks;
    totalConversions += conversions;

    const syncedAt = String(row.synced_at ?? '');
    const hour = new Date(syncedAt).getUTCHours();
    const date = syncedAt.slice(0, 10);

    const hBucket = hourlyMap.get(hour) ?? { impressions: 0, clicks: 0, conversions: 0 };
    hBucket.impressions += impressions;
    hBucket.clicks += clicks;
    hBucket.conversions += conversions;
    hourlyMap.set(hour, hBucket);

    const dBucket = dailyMap.get(date) ?? { impressions: 0, clicks: 0, conversions: 0 };
    dBucket.impressions += impressions;
    dBucket.clicks += clicks;
    dBucket.conversions += conversions;
    dailyMap.set(date, dBucket);
  }

  const hourly = [...hourlyMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([hour, bucket]) => ({
      hour,
      ...bucket,
      ctr: bucket.impressions > 0 ? bucket.clicks / bucket.impressions : 0,
    }));

  const daily = [...dailyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, bucket]) => ({
      date,
      ...bucket,
      ctr: bucket.impressions > 0 ? bucket.clicks / bucket.impressions : 0,
    }));

  return {
    workspaceId,
    periodDays,
    hourly,
    daily,
    totals: {
      impressions: totalImpressions,
      clicks: totalClicks,
      conversions: totalConversions,
      ctr: totalImpressions > 0 ? totalClicks / totalImpressions : 0,
    },
  };
}
