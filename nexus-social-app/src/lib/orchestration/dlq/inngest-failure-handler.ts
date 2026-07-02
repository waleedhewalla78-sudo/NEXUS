/**
 * Feature 004 Sprint 17 — Inngest global failure handler → Postgres DLQ.
 */

import { getInngestClient } from '@/lib/orchestration/inngest-client';
import { persistInngestFailureToDlq } from '@/lib/orchestration/dlq/postgres-dlq';

type InngestFailedEvent = {
  data?: {
    function_id?: string;
    run_id?: string;
    error?: { message?: string; name?: string };
    event?: { data?: Record<string, unknown> };
  };
};

export function getInngestDlqFunctions(): unknown[] {
  const inngest = getInngestClient();

  const onFailureHandler = inngest.createFunction(
    {
      id: 'inngest-failure-dlq',
      name: 'Inngest Failure DLQ',
      triggers: [{ event: 'inngest/function.failed' }],
    },
    async ({ event }: { event: InngestFailedEvent }) => {
      const data = event.data ?? {};
      const payload = data.event?.data ?? {};
      const workspaceId =
        typeof payload.workspaceId === 'string' ? payload.workspaceId : undefined;

      await persistInngestFailureToDlq({
        functionId: data.function_id ?? 'unknown',
        runId: data.run_id,
        errorMessage: data.error?.message ?? 'Unknown Inngest failure',
        errorClass: data.error?.name,
        workspaceId,
        payload,
      });
    },
  );

  return [onFailureHandler];
}
