/**
 * Sprint 7 — Intelligence ingestion (NEW file; does not modify reconciler.ts).
 * Normalizes CSV/JSON into intelligence_ingests via service-role or session client.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export const INTELLIGENCE_SOURCES = [
  'ga4',
  'meta_ads',
  'manual_csv',
  'webhook',
  'other',
] as const;

export type IntelligenceSource = (typeof INTELLIGENCE_SOURCES)[number];

export type IngestRow = Record<string, string | number | null>;

export function isIntelligenceSource(value: string): value is IntelligenceSource {
  return (INTELLIGENCE_SOURCES as readonly string[]).includes(value);
}

/** Minimal CSV parser (no new dependencies). */
export function parseCsvToRows(csvText: string): IngestRow[] {
  const lines = csvText
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]).map((h) => h.trim() || 'col');
  const rows: IngestRow[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cells = splitCsvLine(lines[i]);
    if (cells.every((c) => !c.trim())) continue;
    const row: IngestRow = {};
    headers.forEach((h, idx) => {
      const raw = cells[idx]?.trim() ?? '';
      const num = Number(raw.replace(/,/g, ''));
      row[h] = raw !== '' && Number.isFinite(num) && /^-?\d+(\.\d+)?$/.test(raw.replace(/,/g, ''))
        ? num
        : raw || null;
    });
    rows.push(row);
  }

  return rows;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

export function validateIngestRows(rows: IngestRow[]): { ok: true } | { ok: false; error: string } {
  if (rows.length < 2) {
    return { ok: false, error: 'Must contain at least 2 data rows (plus a header for CSV)' };
  }
  return { ok: true };
}

/** Flag simple >20% spikes/drops when Metric/Value-style columns exist. */
export function detectAnomalies(rows: IngestRow[]): Array<{ metric: string; message: string }> {
  const anomalies: Array<{ metric: string; message: string }> = [];
  if (rows.length < 2) return anomalies;

  const keys = Object.keys(rows[0] ?? {});
  const valueKey =
    keys.find((k) => /^(value|metric_value|sessions|users|conversions|revenue)$/i.test(k)) ??
    keys.find((k) => typeof rows[0][k] === 'number');
  const metricKey = keys.find((k) => /^(metric|name|channel|source)$/i.test(k));

  if (!valueKey) return anomalies;

  for (let i = 1; i < rows.length; i += 1) {
    const prev = Number(rows[i - 1][valueKey]);
    const curr = Number(rows[i][valueKey]);
    if (!Number.isFinite(prev) || !Number.isFinite(curr) || prev === 0) continue;
    const pct = ((curr - prev) / Math.abs(prev)) * 100;
    if (Math.abs(pct) >= 20) {
      const label = metricKey ? String(rows[i][metricKey] ?? valueKey) : valueKey;
      anomalies.push({
        metric: label,
        message: `${label} ${pct > 0 ? 'up' : 'down'} ${Math.abs(pct).toFixed(0)}% vs prior row`,
      });
    }
  }

  return anomalies.slice(0, 10);
}

export async function ingestRawIntelligence(
  supabase: SupabaseClient,
  input: {
    workspaceId: string;
    source: IntelligenceSource;
    rows: IngestRow[];
  },
): Promise<{ ok: true; ingestId: string; anomalies: ReturnType<typeof detectAnomalies> } | { ok: false; error: string }> {
  const validated = validateIngestRows(input.rows);
  if (!validated.ok) return validated;

  const anomalies = detectAnomalies(input.rows);

  const { data, error } = await supabase
    .from('intelligence_ingests')
    .insert({
      workspace_id: input.workspaceId,
      source: input.source,
      raw_data: input.rows,
      row_count: input.rows.length,
      brief_status: 'pending',
      anomalies,
    })
    .select('id')
    .single();

  if (error || !data?.id) {
    return { ok: false, error: error?.message ?? 'Failed to save intelligence ingest' };
  }

  return { ok: true, ingestId: data.id, anomalies };
}
