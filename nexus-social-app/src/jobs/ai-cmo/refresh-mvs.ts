/**
 * Hourly refresh for AI CMO FinOps / attribution materialized views (S14-T004).
 * Requires `refresh_ai_cmo_materialized_views()` RPC (000013 draft SQL section).
 */

import { supabaseAdmin } from '@/lib/supabase/server';

export type RefreshMvsResult = {
  refreshed: boolean;
  views: string[];
  error?: string;
};

const MV_NAMES = ['ai_cmo_cost_summary', 'ai_cmo_attribution_summary'] as const;

export async function refreshAiCmoMaterializedViews(): Promise<RefreshMvsResult> {
  const { error } = await supabaseAdmin.rpc('refresh_ai_cmo_materialized_views');

  if (error) {
    const message = error.message ?? 'MV refresh RPC failed';
    const missingRpc =
      message.includes('Could not find the function')
      || message.includes('does not exist')
      || error.code === 'PGRST202';

    if (missingRpc) {
      console.warn(
        '[refresh-mvs] RPC refresh_ai_cmo_materialized_views not available — apply 000013 MV refresh section or run REFRESH manually',
      );
      return { refreshed: false, views: [], error: 'rpc_not_available' };
    }

    console.error('[refresh-mvs] Failed:', message);
    return { refreshed: false, views: [...MV_NAMES], error: message };
  }

  return { refreshed: true, views: [...MV_NAMES] };
}

export const refreshMvsJobUtils = {
  refreshAiCmoMaterializedViews,
};
