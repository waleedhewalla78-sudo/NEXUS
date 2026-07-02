import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const auth = await authenticateApiRequest(req);
  if (!auth.ok) return auth.response;

  const { data: workspace, error } = await supabaseAdmin
    .from('workspaces')
    .select('id, name, created_at')
    .eq('id', auth.workspaceId)
    .single();

  if (error || !workspace) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
  }

  return NextResponse.json({ data: workspace });
}
