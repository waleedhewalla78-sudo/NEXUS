import { describe, expect, it } from 'vitest';
import {
  MARGIN_GATE_THRESHOLD,
  computeCostToServe,
} from '@/lib/ai-cmo/finops/cost-to-serve';

describe('cost-to-serve margin gate (FR-081 / CL-053)', () => {
  it('passes when gross margin >= 55%', () => {
    const result = computeCostToServe({
      mrrUsd: 6000,
      llmApiUsd: 220,
      whatsappMessageUsd: 60,
      bspFeeUsd: 90,
      pitCrewLaborUsd: 1500,
      infraAllocUsd: 180,
    });
    expect(result.totalCostUsd).toBe(2050);
    expect(result.grossMarginUsd).toBe(3950);
    expect(result.grossMarginPct).toBeCloseTo(0.6583, 3);
    expect(result.passesMarginGate).toBe(true);
    expect(result.gateThreshold).toBe(MARGIN_GATE_THRESHOLD);
  });

  it('fails when gross margin < 55%', () => {
    const result = computeCostToServe({
      mrrUsd: 4000,
      llmApiUsd: 500,
      whatsappMessageUsd: 200,
      bspFeeUsd: 100,
      pitCrewLaborUsd: 2000,
      infraAllocUsd: 300,
    });
    expect(result.totalCostUsd).toBe(3100);
    expect(result.grossMarginPct).toBeCloseTo(0.225, 3);
    expect(result.passesMarginGate).toBe(false);
  });

  it('handles zero MRR without throwing', () => {
    const result = computeCostToServe({
      mrrUsd: 0,
      llmApiUsd: 10,
      whatsappMessageUsd: 0,
      bspFeeUsd: 0,
      pitCrewLaborUsd: 0,
      infraAllocUsd: 0,
    });
    expect(result.grossMarginPct).toBe(0);
    expect(result.passesMarginGate).toBe(false);
  });
});
