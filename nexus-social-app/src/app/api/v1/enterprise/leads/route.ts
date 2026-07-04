import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase/action';

export const runtime = 'nodejs';

/**
 * GET /api/v1/enterprise/leads
 * Session-authenticated list for the caller's workspace (RLS enforced).
 */
export async function GET(_req: NextRequest) {
  const supabase = await createServerComponentClient();

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: membership, error: memberError } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  const workspaceId =
    membership?.workspace_id ?? process.env.NEXT_PUBLIC_DEFAULT_WORKSPACE_ID ?? null;

  if (!workspaceId) {
    return NextResponse.json({ error: 'No workspace membership found' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('enterprise_leads')
    .select(
      'id, workspace_id, source, status, first_name, last_name, email, phone, company, message, abm_account_id, metadata, created_at',
    )
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
