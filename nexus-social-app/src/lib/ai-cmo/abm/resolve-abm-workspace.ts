import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import { createServerComponentClient } from '@/lib/supabase/action';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function resolveAbmWorkspaceId(
  req: NextRequest,
): Promise<{ workspaceId: string; useAdmin: boolean } | { response: NextResponse }> {
  const apiAuth = await authenticateApiRequest(req);
  if (apiAuth.ok) {
    return { workspaceId: apiAuth.workspaceId, useAdmin: true };
  }

  const hasApiKeyHeader =
    req.headers.get('x-api-key')?.trim() ||
    req.headers.get('authorization')?.startsWith('Bearer ');

  if (hasApiKeyHeader) {
    return { response: apiAuth.response };
  }

  const supabase = await createServerComponentClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return {
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const { data: membership } = await supabaseAdmin
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  const workspaceId =
    membership?.workspace_id ?? process.env.UAT_DEMO_WORKSPACE_ID ?? process.env.NEXT_PUBLIC_DEFAULT_WORKSPACE_ID;

  if (!workspaceId) {
    return {
      response: NextResponse.json({ error: 'No workspace membership' }, { status: 403 }),
    };
  }

  return { workspaceId: String(workspaceId), useAdmin: false };
}
