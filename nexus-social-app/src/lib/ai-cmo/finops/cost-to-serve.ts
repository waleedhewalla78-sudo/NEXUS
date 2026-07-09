/**
 * Cost-to-serve + gross-margin gate (FR-081 / CL-053).
 * Pure calculator — persist via FinOps ledger / reports in later phases.
 */

export const MARGIN_GATE_THRESHOLD = 0.55;

export type CostToServeInput = {
  /** Monthly recurring revenue for the client (USD). */
  mrrUsd: number;
  llmApiUsd: number;
  whatsappMessageUsd: number;
  bspFeeUsd: number;
  pitCrewLaborUsd: number;
  infraAllocUsd: number;
};

export type CostToServeResult = {
  totalCostUsd: number;
  grossMarginUsd: number;
  grossMarginPct: number;
  /** True when margin meets or exceeds the ≥55% gate. */
  passesMarginGate: boolean;
  gateThreshold: number;
};

export function computeCostToServe(input: CostToServeInput): CostToServeResult {
  const totalCostUsd =
    input.llmApiUsd +
    input.whatsappMessageUsd +
    input.bspFeeUsd +
    input.pitCrewLaborUsd +
    input.infraAllocUsd;

  const grossMarginUsd = input.mrrUsd - totalCostUsd;
  const grossMarginPct = input.mrrUsd > 0 ? grossMarginUsd / input.mrrUsd : 0;

  return {
    totalCostUsd: round2(totalCostUsd),
    grossMarginUsd: round2(grossMarginUsd),
    grossMarginPct: Number(grossMarginPct.toFixed(6)),
    passesMarginGate: grossMarginPct >= MARGIN_GATE_THRESHOLD,
    gateThreshold: MARGIN_GATE_THRESHOLD,
  };
}

function round2(n: number): number {
  return Number(n.toFixed(2));
}
