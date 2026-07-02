import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase/action';
import { supabaseAdmin } from '@/lib/supabase/server';
import { queryAbmAccounts, isMissingTableError } from '@/lib/ai-cmo/abm/accounts-query';
import { resolveAbmWorkspaceId } from '@/lib/ai-cmo/abm/resolve-abm-workspace';

/**
 * GET /api/v1/ai-cmo/abm/accounts
 * Returns RLS-scoped account_intent_scores for the active workspace.
 */
export async function GET(req: NextRequest) {
  const resolved = await resolveAbmWorkspaceId(req);
  if ('response' in resolved) return resolved.response;

  const supabase = resolved.useAdmin ? supabaseAdmin : await createServerComponentClient();
  const { accounts, error } = await queryAbmAccounts(supabase, resolved.workspaceId);

  if (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json(
        {
          accounts: [],
          workspaceId: resolved.workspaceId,
          configured: false,
          message: 'Run supabase/migrations/20260630_enterprise_abm_tables.sql then npm run seed:abm-demo',
        },
        { status: 200 },
      );
    }
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({
    accounts,
    workspaceId: resolved.workspaceId,
    configured: accounts.length > 0,
    source: 'account_intent_scores',
  });
}
