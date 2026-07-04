import { describe, expect, it } from 'vitest';
import {
  detectAnomalies,
  parseCsvToRows,
  validateIngestRows,
} from '@/lib/intelligence/ingest-raw';

describe('parseCsvToRows', () => {
  it('parses header + rows', () => {
    const rows = parseCsvToRows('Date,Metric,Value\n2026-01-01,Sessions,100\n2026-01-02,Sessions,130');
    expect(rows).toHaveLength(2);
    expect(rows[0].Metric).toBe('Sessions');
    expect(rows[1].Value).toBe(130);
  });
});

describe('validateIngestRows', () => {
  it('requires at least 2 rows', () => {
    expect(validateIngestRows([{ a: 1 }]).ok).toBe(false);
    expect(validateIngestRows([{ a: 1 }, { a: 2 }]).ok).toBe(true);
  });
});

describe('detectAnomalies', () => {
  it('flags >20% moves', () => {
    const anomalies = detectAnomalies([
      { Metric: 'Sessions', Value: 100 },
      { Metric: 'Sessions', Value: 130 },
    ]);
    expect(anomalies.length).toBeGreaterThan(0);
    expect(anomalies[0].message).toMatch(/30%/);
  });
});
