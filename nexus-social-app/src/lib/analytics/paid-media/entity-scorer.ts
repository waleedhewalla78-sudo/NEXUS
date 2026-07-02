import { aggregateKpis, computeRowKpis, median, type RowKpis } from './kpi-calculator';
import type { MappedRow } from './kpi-calculator';

export type EntityStatus = 'Scale' | 'Optimize' | 'Test More' | 'Pause';

export type ScoredEntity = {
  name: string;
  level: 'campaign' | 'adset' | 'ad';
  kpis: RowKpis;
  score: number;
  status: EntityStatus;
  spendShare: number;
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function scoreEntityKpis(entity: RowKpis, medians: Partial<Record<keyof RowKpis, number | null>>): number {
  let score = 50;

  if (entity.roas != null && medians.roas != null && medians.roas > 0) {
    score += (entity.roas / medians.roas - 1) * 20;
  }
  if (entity.cpa != null && medians.cpa != null && entity.cpa > 0) {
    score += (medians.cpa / entity.cpa - 1) * 15;
  }
  if (entity.ctr != null && medians.ctr != null && medians.ctr > 0) {
    score += (entity.ctr / medians.ctr - 1) * 10;
  }
  if (entity.cpm != null && medians.cpm != null && entity.cpm > 0) {
    score += (medians.cpm / entity.cpm - 1) * 5;
  }

  return clamp(score, 0, 100);
}

export function classifyEntity(score: number, conversions: number): EntityStatus {
  if (score >= 70 && conversions > 0) return 'Scale';
  if (score >= 50) return 'Optimize';
  if (score >= 30) return 'Test More';
  return 'Pause';
}

export function scoreEntitiesByField(
  rows: MappedRow[],
  field: 'campaign_name' | 'adset_name' | 'ad_name',
): ScoredEntity[] {
  const groups = new Map<string, MappedRow[]>();
  for (const row of rows) {
    const name = String(row[field] ?? '').trim() || '(unnamed)';
    const list = groups.get(name) ?? [];
    list.push(row);
    groups.set(name, list);
  }

  const entityKpis = [...groups.entries()].map(([name, groupRows]) => ({
    name,
    kpis: aggregateKpis(groupRows),
  }));

  const medians = {
    roas: median(entityKpis.map((e) => e.kpis.roas).filter((v): v is number => v != null)),
    cpa: median(entityKpis.map((e) => e.kpis.cpa).filter((v): v is number => v != null)),
    ctr: median(entityKpis.map((e) => e.kpis.ctr).filter((v): v is number => v != null)),
    cpm: median(entityKpis.map((e) => e.kpis.cpm).filter((v): v is number => v != null)),
  };

  const totalSpend = entityKpis.reduce((s, e) => s + e.kpis.spend, 0);

  const level =
    field === 'campaign_name' ? 'campaign' : field === 'adset_name' ? 'adset' : 'ad';

  return entityKpis
    .map(({ name, kpis }) => {
      const score = scoreEntityKpis(kpis, medians);
      return {
        name,
        level: level as ScoredEntity['level'],
        kpis,
        score,
        status: classifyEntity(score, kpis.conversions),
        spendShare: totalSpend > 0 ? kpis.spend / totalSpend : 0,
      };
    })
    .sort((a, b) => b.score - a.score);
}

export function detectAnomalies(rows: MappedRow[]): string[] {
  const anomalies: string[] = [];
  for (const row of rows) {
    const k = computeRowKpis(row);
    const label = String(row.campaign_name ?? row.ad_name ?? 'row');
    if (k.spend === 0 && k.conversions > 0) {
      anomalies.push(`${label}: spend=0 with conversions=${k.conversions}`);
    }
    if (k.ctr != null && k.ctr > 0.5) {
      anomalies.push(`${label}: CTR ${(k.ctr * 100).toFixed(1)}% (>50%)`);
    }
  }
  return anomalies;
}
