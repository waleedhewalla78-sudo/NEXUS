/**
 * Nightly attribution calculation Inngest job (ABM Function #3).
 */

import { cron } from 'inngest';
import { getInngestClient } from '@/lib/orchestration/inngest-client';
import { supabaseAdmin } from '@/lib/supabase/server';
import { runNightlyAttributionCalculation } from '@/lib/ai-cmo/attribution/calculate';

export type AttributionCalculationResult = {
  processed: number;
  succeeded: number;
  failed: number;
  errors: string[];
};

export async function runAttributionCalculationForAllWorkspaces(): Promise<AttributionCalculationResult> {
  const { data: workspacesData, error } = await supabaseAdmin
    .from('workspaces')
    .select('id')
    .limit(200);

  const workspaces = workspacesData ?? [];

  if (error) {
    return { processed: 0, succeeded: 0, failed: 0, errors: [error.message] };
  }

  let succeeded = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const ws of workspaces) {
    const workspaceId = String(ws.id);
    const result = await runNightlyAttributionCalculation(workspaceId, `system:${workspaceId}`);
    if (result.ok) {
      succeeded += 1;
    } else {
      failed += 1;
      errors.push(`${workspaceId}: ${result.error}`);
    }
  }

  return {
    processed: workspaces.length,
    succeeded,
    failed,
    errors,
  };
}

export function getAttributionCalculationInngestFunctions(): unknown[] {
  const inngest = getInngestClient();

  const attributionCalculation = inngest.createFunction(
    { id: 'attribution-calculation', retries: 1, triggers: [cron('0 3 * * *')] },
    async () => runAttributionCalculationForAllWorkspaces(),
  );

  return [attributionCalculation];
}

export const attributionCalculationJobUtils = {
  runAttributionCalculationForAllWorkspaces,
  getAttributionCalculationInngestFunctions,
};
