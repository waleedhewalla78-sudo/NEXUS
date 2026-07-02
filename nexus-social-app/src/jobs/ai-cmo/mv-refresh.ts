/**
 * Feature 004 Phase 6 — Hourly FinOps MV refresh (Issue H9).
 *
 * [SPEC]
 * - REFRESH MATERIALIZED VIEW CONCURRENTLY ai_cmo_cost_summary
 * - REFRESH MATERIALIZED VIEW CONCURRENTLY ai_cmo_attribution_summary
 * - Uses Supabase admin client (MVs bypass standard RLS)
 * - Handles concurrent refresh lock contention gracefully
 */

import { cron } from 'inngest';
import { refreshAiCmoMaterializedViews } from '@/jobs/ai-cmo/refresh-mvs';
import { getInngestClient } from '@/lib/orchestration/inngest-client';

export type MvRefreshResult = {
  refreshed: boolean;
  views: string[];
  durationMs: number;
  error?: string;
  lockContention?: boolean;
};

const MV_NAMES = ['ai_cmo_cost_summary', 'ai_cmo_attribution_summary'] as const;

function isLockContentionError(message: string): boolean {
  return (
    /could not obtain lock/i.test(message)
    || /concurrent refresh/i.test(message)
    || /deadlock/i.test(message)
    || /lock_not_available/i.test(message)
  );
}

export async function runMvRefresh(): Promise<MvRefreshResult> {
  const startedAt = Date.now();
  const rpcResult = await refreshAiCmoMaterializedViews();

  if (rpcResult.refreshed) {
    return {
      refreshed: true,
      views: [...MV_NAMES],
      durationMs: Date.now() - startedAt,
    };
  }

  if (rpcResult.error === 'rpc_not_available') {
    return {
      refreshed: false,
      views: [...MV_NAMES],
      durationMs: Date.now() - startedAt,
      error: 'rpc_not_available',
    };
  }

  const message = rpcResult.error ?? 'unknown';
  if (isLockContentionError(message)) {
    console.warn('[mv-refresh] Concurrent refresh lock contention — will retry next hour');
    return {
      refreshed: false,
      views: [...MV_NAMES],
      durationMs: Date.now() - startedAt,
      error: message,
      lockContention: true,
    };
  }

  console.error('[mv-refresh] Failed:', message);
  return {
    refreshed: false,
    views: [...MV_NAMES],
    durationMs: Date.now() - startedAt,
    error: message,
  };
}

export function getMvRefreshInngestFunctions(): unknown[] {
  const inngest = getInngestClient();

  const mvRefreshCron = inngest.createFunction(
    { id: 'mv-refresh', retries: 1, triggers: [cron('0 * * * *')] },
    async () => runMvRefresh(),
  );

  return [mvRefreshCron];
}

export const mvRefreshJobUtils = {
  runMvRefresh,
  getMvRefreshInngestFunctions,
};
