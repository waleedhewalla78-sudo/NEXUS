'use server';

import { supabaseAdmin } from '@/lib/supabase/server';

function isMissingBillingInfraError(code?: string, message?: string) {
  const msg = (message ?? '').toLowerCase();
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    code === 'PGRST202' ||
    msg.includes('schema cache') ||
    msg.includes('does not exist') ||
    msg.includes('could not find the function') ||
    msg.includes('could not find the table')
  );
}

/**
 * Deducts AI credits for a given workspace.
 * Throws an error if credits are exhausted.
 * In development, skips deduction when billing tables/RPC are not migrated yet.
 */
export async function deductAiCredits(workspaceId: string, amount: number = 1): Promise<void> {
  const { data: success, error: rpcErr } = await supabaseAdmin.rpc('deduct_ai_credits', {
    p_workspace_id: workspaceId,
    p_amount: amount,
  });

  if (rpcErr) {
    if (process.env.NODE_ENV === 'development' && isMissingBillingInfraError(rpcErr.code, rpcErr.message)) {
      console.warn(
        '[billing] AI credits infra missing in dev; skipping deduction. Run src/sql/schema_patch.sql in Supabase.',
        rpcErr.message,
      );
      return;
    }
    console.error('RPC Error deducting credits:', rpcErr);
    throw new Error('Failed to deduct AI credits');
  }

  if (!success) {
    throw new Error('PAYMENT_REQUIRED: Insufficient AI credits. Please upgrade your plan.');
  }
}
