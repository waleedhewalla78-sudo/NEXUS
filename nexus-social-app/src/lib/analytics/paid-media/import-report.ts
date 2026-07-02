import {
  applyColumnMapping,
  autoMapColumns,
  detectPlatform,
  parseCsv,
} from '@/lib/analytics/paid-media/column-variants';
import { aggregateKpis } from '@/lib/analytics/paid-media/kpi-calculator';
import { detectAnomalies, scoreEntitiesByField, type ScoredEntity } from '@/lib/analytics/paid-media/entity-scorer';
import type { RowKpis } from '@/lib/analytics/paid-media/kpi-calculator';

export type PaidMediaImportReport = {
  platform: ReturnType<typeof detectPlatform>;
  rowCount: number;
  mappedFieldCount: number;
  suggestedMapping: ReturnType<typeof autoMapColumns>;
  unmappedHeaders: string[];
  accountKpis: RowKpis;
  entities: ScoredEntity[];
  anomalies: string[];
  recommendations: string[];
};

function buildRecommendations(entities: ScoredEntity[], account: RowKpis): string[] {
  const out: string[] = [];
  const winners = entities.filter((e) => e.status === 'Scale').slice(0, 3);
  const losers = entities.filter((e) => e.status === 'Pause').slice(0, 3);

  if (account.roas != null) {
    out.push(`Account ROAS: ${account.roas.toFixed(2)}`);
  }
  if (account.cpa != null) {
    out.push(`Account CPA: ${account.cpa.toFixed(2)}`);
  }
  for (const w of winners) {
    out.push(
      `Scale: "${w.name}" — score ${w.score.toFixed(0)}, ROAS ${w.kpis.roas?.toFixed(2) ?? '—'}`,
    );
  }
  for (const l of losers) {
    out.push(
      `Pause/review: "${l.name}" — score ${l.score.toFixed(0)}, spend share ${(l.spendShare * 100).toFixed(1)}%`,
    );
  }
  if (out.length === 0) out.push('Insufficient conversion data for reallocation recommendations.');
  return out;
}

export function buildPaidMediaImportReport(
  csvText: string,
  breakdown: 'campaign' | 'adset' | 'ad' = 'campaign',
): PaidMediaImportReport {
  const { headers, rows } = parseCsv(csvText);
  if (headers.length === 0 || rows.length === 0) {
    throw new Error('Empty or invalid CSV');
  }

  const platform = detectPlatform(headers);
  const suggestedMapping = autoMapColumns(headers);
  const mapped = applyColumnMapping(rows, suggestedMapping);
  const accountKpis = aggregateKpis(mapped);

  const breakdownField =
    breakdown === 'adset' ? 'adset_name' : breakdown === 'ad' ? 'ad_name' : 'campaign_name';

  const entities = scoreEntitiesByField(mapped, breakdownField);
  const anomalies = detectAnomalies(mapped);

  return {
    platform,
    rowCount: rows.length,
    mappedFieldCount: Object.values(suggestedMapping).filter(Boolean).length,
    suggestedMapping,
    unmappedHeaders: headers.filter((h) => !Object.values(suggestedMapping).includes(h)),
    accountKpis,
    entities: entities.slice(0, 100),
    anomalies,
    recommendations: buildRecommendations(entities, accountKpis),
  };
}
