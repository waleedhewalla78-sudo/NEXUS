export type ConfidenceInputs = {
  dataQuality: number;
  historicalPerformance: number;
  policyCompliance: number;
  marketVolatility: number;
};

export type ConfidenceWeights = {
  dataQuality: number;
  historicalPerformance: number;
  policyCompliance: number;
  marketVolatility: number;
};

export const DEFAULT_CONFIDENCE_WEIGHTS: ConfidenceWeights = {
  dataQuality: 0.3,
  historicalPerformance: 0.25,
  policyCompliance: 0.25,
  marketVolatility: 0.2,
};

function clamp(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

export function computeCalibratedConfidence(
  inputs: ConfidenceInputs,
  weights: ConfidenceWeights = DEFAULT_CONFIDENCE_WEIGHTS,
): number {
  const normalized: ConfidenceInputs = {
    dataQuality: clamp(inputs.dataQuality),
    historicalPerformance: clamp(inputs.historicalPerformance),
    policyCompliance: clamp(inputs.policyCompliance),
    marketVolatility: clamp(inputs.marketVolatility),
  };

  const score =
    normalized.dataQuality * weights.dataQuality +
    normalized.historicalPerformance * weights.historicalPerformance +
    normalized.policyCompliance * weights.policyCompliance +
    normalized.marketVolatility * weights.marketVolatility;

  return round4(clamp(score));
}

export type ConfidenceBand = 'low' | 'medium' | 'high';

export function confidenceBand(score: number): ConfidenceBand {
  if (score >= 0.85) return 'high';
  if (score >= 0.65) return 'medium';
  return 'low';
}

export const calibratedConfidenceUtils = {
  computeCalibratedConfidence,
  confidenceBand,
  DEFAULT_CONFIDENCE_WEIGHTS,
};
