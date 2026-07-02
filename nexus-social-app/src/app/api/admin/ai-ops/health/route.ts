import { NextResponse } from 'next/server';
import { checkSystemHealth } from '@/actions/health';
import { collectAiOpsMetrics } from '@/lib/ai-cmo/ai-ops-metrics';
import { unauthorizedInternalResponse, verifyInternalBearer } from '@/lib/internal-auth';

export async function GET(req: Request) {
  if (!verifyInternalBearer(req)) {
    return unauthorizedInternalResponse();
  }

  const [systemHealth, aiOps] = await Promise.all([
    checkSystemHealth(),
    collectAiOpsMetrics().catch((err: unknown) => ({
      error: err instanceof Error ? err.message : String(err),
    })),
  ]);

  return NextResponse.json({
    status: systemHealth.overall,
    system: systemHealth,
    aiOps,
    langfuse: {
      enabled: false,
      note: 'Langfuse blocked pending A-GATE-002 leadership decision',
    },
    inngest: {
      enabled: false,
      note: 'Inngest blocked pending A-GATE-001; Redis BRPOP orchestration active',
    },
    collectedAt: new Date().toISOString(),
  });
}
