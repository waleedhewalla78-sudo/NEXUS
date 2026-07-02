import { describe, it, expect } from 'vitest';
import { computeMean, computeStdDev, detectAnomaliesFromSeries } from '@/lib/ai-cmo/agents/sentinel-data';

describe('Sentinel time-series math', () => {
  it('computes mean and standard deviation', () => {
    const values = [10, 12, 14, 16, 18];
    const mean = computeMean(values);
    expect(mean).toBe(14);
    expect(computeStdDev(values, mean)).toBeCloseTo(3.162, 2);
  });

  it('flags anomaly when current value below mean - 2*stdDev', () => {
    const series = [
      { date: '2026-06-01', impressions: 1000, engagement: 0.05 },
      { date: '2026-06-02', impressions: 1100, engagement: 0.05 },
      { date: '2026-06-03', impressions: 1050, engagement: 0.05 },
      { date: '2026-06-04', impressions: 980, engagement: 0.05 },
      { date: '2026-06-05', impressions: 1200, engagement: 0.05 },
      { date: '2026-06-06', impressions: 1150, engagement: 0.05 },
      { date: '2026-06-07', impressions: 1000, engagement: 0.005 },
    ];

    const anomalies = detectAnomaliesFromSeries('engagement_rate', series);
    expect(anomalies.length).toBe(1);
    expect(anomalies[0]?.currentValue).toBe(0.005);
    expect(anomalies[0]?.dropPct).toBeGreaterThan(50);
  });
});
