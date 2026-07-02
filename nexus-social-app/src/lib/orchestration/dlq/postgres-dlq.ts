/**
 * Feature 004 Sprint 17 — Inngest failure DLQ via L7 reconciler.
 */

import { SorTableNames } from '@/lib/sync/reconciler';
import { secureSyncToSoR } from '@/lib/ai-cmo/utils/secure-reconciler-writer';

export type InngestFailurePayload = {
  functionId: string;
  runId?: string;
  failedStep?: string;
  errorMessage: string;
  errorClass?: string;
  workspaceId?: string;
  payload?: Record<string, unknown>;
  langfuseTraceId?: string;
};

export async function persistInngestFailureToDlq(
  failure: InngestFailurePayload,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const userId = 'inngest-dlq-system';

  const result = await secureSyncToSoR({
    table: SorTableNames.AI_CMO_FAILED_JOBS,
    workspaceId: failure.workspaceId ?? '00000000-0000-0000-0000-000000000000',
    userId,
    auditAction: 'ai_cmo.inngest.job_failed',
    data: {
      workspace_id: failure.workspaceId ?? null,
      job_id: failure.runId ?? null,
      inngest_run_id: failure.runId ?? null,
      function_id: failure.functionId,
      failed_step: failure.failedStep ?? null,
      error_message: failure.errorMessage,
      error_class: failure.errorClass ?? null,
      payload: failure.payload ?? {},
      langfuse_trace_id: failure.langfuseTraceId ?? null,
    },
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return { ok: true, id: result.id };
}
