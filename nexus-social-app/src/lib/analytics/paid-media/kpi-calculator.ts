import type { CanonicalField } from './column-variants';

export type MappedRow = Record<CanonicalField, string | number | null>;

export type RowKpis = {
  spend: number;  impressions: number;
  clicks: number;
  purchases: number;
  leads: number;
  revenue: number;
  reach: number;
  conversions: number;
  frequency: number | null;
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  cvr: number | null;
  cpa: number | null;
  roas: number | null;
  aov: number | null;
};

function num(v: string | number | null | undefined): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  return 0;
}

export function computeRowKpis(row: MappedRow): RowKpis {
  const spend = num(row.spend);
  const impressions = num(row.impressions);
  const clicks = num(row.clicks) || num(row.link_clicks);
  const purchases = num(row.purchases);
  const leads = num(row.leads);
  const revenue = num(row.revenue);
  const reach = num(row.reach);
  const conversions = purchases || leads;

  const frequency =
    row.frequency !== null && row.frequency !== undefined
      ? num(row.frequency)
      : reach > 0
        ? impressions / reach
        : null;

  return {
    spend,
    impressions,
    clicks,
    purchases,
    leads,
    revenue,
    reach,
    conversions,
    frequency,
    ctr: impressions > 0 ? clicks / impressions : null,
    cpc: clicks > 0 ? spend / clicks : null,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : null,
    cvr: clicks > 0 ? conversions / clicks : null,
    cpa: conversions > 0 ? spend / conversions : null,
    roas: spend > 0 && revenue > 0 ? revenue / spend : null,
    aov: purchases > 0 && revenue > 0 ? revenue / purchases : null,
  };
}

export function aggregateKpis(rows: MappedRow[]): RowKpis {
  const totals = rows.reduce(
    (acc, row) => {
      const k = computeRowKpis(row);
      acc.spend += k.spend;
      acc.impressions += k.impressions;
      acc.clicks += k.clicks;
      acc.purchases += k.purchases;
      acc.leads += k.leads;
      acc.revenue += k.revenue;
      acc.reach += k.reach;
      acc.conversions += k.conversions;
      return acc;
    },
    {
      spend: 0,
      impressions: 0,
      clicks: 0,
      purchases: 0,
      leads: 0,
      revenue: 0,
      reach: 0,
      conversions: 0,
    },
  );

  return {
    ...totals,
    frequency: totals.reach > 0 ? totals.impressions / totals.reach : null,
    ctr: totals.impressions > 0 ? totals.clicks / totals.impressions : null,
    cpc: totals.clicks > 0 ? totals.spend / totals.clicks : null,
    cpm: totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : null,
    cvr: totals.clicks > 0 ? totals.conversions / totals.clicks : null,
    cpa: totals.conversions > 0 ? totals.spend / totals.conversions : null,
    roas: totals.spend > 0 && totals.revenue > 0 ? totals.revenue / totals.spend : null,
    aov: totals.purchases > 0 && totals.revenue > 0 ? totals.revenue / totals.purchases : null,
  };
}

export function median(values: number[]): number | null {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}
