/**
 * Feature 006 Phase 3 — Margin gate report API (FR-091).
 * POST computes + persists snapshot; GET returns latest decision.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  buildMarginGateReport,
  getLatestMarginGateDecision,
  persistCostToServeSnapshot,
} from '@/lib/ai-cmo/finops/margin-gate-report';
import { uuidLikeSchema } from '@/lib/validation/uuid-like';

export const runtime = 'nodejs';

const postBodySchema = z.object({
  workspaceId: uuidLikeSchema,
  userId: z.string().optional(),
  periodMonth: z.string().regex(/^\d{4}-\d{2}-01$/),
  mrrUsd: z.number().nonnegative(),
  llmApiUsd: z.number().nonnegative().default(0),
  whatsappMessageUsd: z.number().nonnegative().default(0),
  bspFeeUsd: z.number().nonnegative().default(0),
  pitCrewLaborUsd: z.number().nonnegative().default(0),
  infraAllocUsd: z.number().nonnegative().default(0),
  /** When false, compute only — do not persist. */
  persist: z.boolean().optional().default(true),
});

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get('workspaceId');
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });
  }
  const latest = await getLatestMarginGateDecision(workspaceId);
  return NextResponse.json({ workspaceId, ...latest });
}

export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = postBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const body = parsed.data;
  const costs = {
    mrrUsd: body.mrrUsd,
    llmApiUsd: body.llmApiUsd,
    whatsappMessageUsd: body.whatsappMessageUsd,
    bspFeeUsd: body.bspFeeUsd,
    pitCrewLaborUsd: body.pitCrewLaborUsd,
    infraAllocUsd: body.infraAllocUsd,
  };

  if (!body.persist) {
    const report = buildMarginGateReport({
      workspaceId: body.workspaceId,
      periodMonth: body.periodMonth,
      costs,
    });
    return NextResponse.json({ report }, { status: 200 });
  }

  const result = await persistCostToServeSnapshot({
    workspaceId: body.workspaceId,
    userId: body.userId ?? 'system:margin-gate',
    periodMonth: body.periodMonth,
    costs,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, report: result.report },
      { status: 422 },
    );
  }

  return NextResponse.json(
    { ok: true, id: result.id, report: result.report },
    { status: result.report.stopScale ? 200 : 200 },
  );
}
