import { describe, expect, it } from 'vitest';
import {
  computeCalibratedConfidence,
  confidenceBand,
  DEFAULT_CONFIDENCE_WEIGHTS,
} from '@/lib/evaluation/calibrated-confidence';

describe('calibrated-confidence', () => {
  it('is deterministic for identical inputs', () => {
    const inputs = {
      dataQuality: 0.9,
      historicalPerformance: 0.8,
      policyCompliance: 1,
      marketVolatility: 0.6,
    };
    const a = computeCalibratedConfidence(inputs);
    const b = computeCalibratedConfidence(inputs);
    expect(a).toBe(b);
  });

  it('applies PRD weights (30/25/25/20)', () => {
    const score = computeCalibratedConfidence({
      dataQuality: 1,
      historicalPerformance: 1,
      policyCompliance: 1,
      marketVolatility: 1,
    });
    expect(score).toBe(1);
    const weightSum =
      DEFAULT_CONFIDENCE_WEIGHTS.dataQuality +
      DEFAULT_CONFIDENCE_WEIGHTS.historicalPerformance +
      DEFAULT_CONFIDENCE_WEIGHTS.policyCompliance +
      DEFAULT_CONFIDENCE_WEIGHTS.marketVolatility;
    expect(weightSum).toBeCloseTo(1, 5);
  });

  it('clamps out-of-range inputs', () => {
    const score = computeCalibratedConfidence({
      dataQuality: 2,
      historicalPerformance: -1,
      policyCompliance: 0.5,
      marketVolatility: 0.5,
    });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('maps confidence bands', () => {
    expect(confidenceBand(0.9)).toBe('high');
    expect(confidenceBand(0.7)).toBe('medium');
    expect(confidenceBand(0.4)).toBe('low');
  });
});
