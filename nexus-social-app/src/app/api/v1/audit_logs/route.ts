import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const auth = await authenticateApiRequest(req);
  if (!auth.ok) return auth.response;

  const { data, error } = await supabaseAdmin
    .from('audit_logs')
    .select('id, action, actor_id, metadata, created_at')
    .eq('workspace_id', auth.workspaceId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}
