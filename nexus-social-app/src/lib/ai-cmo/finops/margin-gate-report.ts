/**
 * Feature 006 Phase 3 — Margin gate report + stop-scale (FR-091 / CL-053).
 */

import {
  computeCostToServe,
  MARGIN_GATE_THRESHOLD,
  type CostToServeInput,
  type CostToServeResult,
} from '@/lib/ai-cmo/finops/cost-to-serve';
import { SorTableNames } from '@/lib/ai-cmo/types/reconciler';
import { secureSyncToSoR } from '@/lib/ai-cmo/utils/secure-reconciler-writer';
import { supabaseAdmin } from '@/lib/supabase/server';

export type MarginGateReport = CostToServeResult & {
  workspaceId: string;
  periodMonth: string;
  mrrUsd: number;
  costs: Omit<CostToServeInput, 'mrrUsd'>;
  decision: 'PASS' | 'FAIL';
  stopScale: boolean;
  message: string;
};

export function buildMarginGateReport(input: {
  workspaceId: string;
  periodMonth: string;
  costs: CostToServeInput;
}): MarginGateReport {
  const result = computeCostToServe(input.costs);
  const decision = result.passesMarginGate ? 'PASS' : 'FAIL';
  return {
    ...result,
    workspaceId: input.workspaceId,
    periodMonth: input.periodMonth,
    mrrUsd: input.costs.mrrUsd,
    costs: {
      llmApiUsd: input.costs.llmApiUsd,
      whatsappMessageUsd: input.costs.whatsappMessageUsd,
      bspFeeUsd: input.costs.bspFeeUsd,
      pitCrewLaborUsd: input.costs.pitCrewLaborUsd,
      infraAllocUsd: input.costs.infraAllocUsd,
    },
    decision,
    stopScale: decision === 'FAIL',
    message:
      decision === 'PASS'
        ? `Gross margin ${(result.grossMarginPct * 100).toFixed(1)}% ≥ ${(MARGIN_GATE_THRESHOLD * 100).toFixed(0)}% — scale allowed.`
        : `Gross margin ${(result.grossMarginPct * 100).toFixed(1)}% < ${(MARGIN_GATE_THRESHOLD * 100).toFixed(0)}% — STOP SCALE (CL-053).`,
  };
}

export async function persistCostToServeSnapshot(input: {
  workspaceId: string;
  userId: string;
  periodMonth: string;
  costs: CostToServeInput;
}): Promise<{ ok: boolean; id?: string; report: MarginGateReport; error?: string }> {
  const report = buildMarginGateReport({
    workspaceId: input.workspaceId,
    periodMonth: input.periodMonth,
    costs: input.costs,
  });

  const result = await secureSyncToSoR({
    table: SorTableNames.COST_TO_SERVE_SNAPSHOTS,
    workspaceId: input.workspaceId,
    userId: input.userId,
    auditAction: 'finops.cost_to_serve.snapshot',
    auditMetadata: { decision: report.decision, stopScale: report.stopScale },
    data: {
      workspace_id: input.workspaceId,
      period_month: input.periodMonth,
      mrr_usd: report.mrrUsd,
      llm_api_usd: report.costs.llmApiUsd,
      whatsapp_message_usd: report.costs.whatsappMessageUsd,
      bsp_fee_usd: report.costs.bspFeeUsd,
      pit_crew_labor_usd: report.costs.pitCrewLaborUsd,
      infra_alloc_usd: report.costs.infraAllocUsd,
      total_cost_usd: report.totalCostUsd,
      gross_margin_usd: report.grossMarginUsd,
      gross_margin_pct: report.grossMarginPct,
      passes_margin_gate: report.passesMarginGate,
      stop_scale: report.stopScale,
      metadata: { message: report.message },
    },
  });

  if (!result.ok) {
    return { ok: false, report, error: result.error };
  }
  return { ok: true, id: result.id, report };
}

export async function getLatestMarginGateDecision(
  workspaceId: string,
): Promise<{ stopScale: boolean; decision: 'PASS' | 'FAIL' | 'unknown'; periodMonth?: string }> {
  const { data } = await supabaseAdmin
    .from('cost_to_serve_snapshots')
    .select('stop_scale, passes_margin_gate, period_month')
    .eq('workspace_id', workspaceId)
    .order('period_month', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return { stopScale: false, decision: 'unknown' };
  return {
    stopScale: Boolean(data.stop_scale),
    decision: data.passes_margin_gate ? 'PASS' : 'FAIL',
    periodMonth: data.period_month as string,
  };
}
