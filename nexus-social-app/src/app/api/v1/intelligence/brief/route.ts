import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase/action';
import { supabaseAdmin } from '@/lib/supabase/server';
import { runBriefingForWorkspace } from '@/lib/intelligence/briefing-agent';
import { requestIntelligenceBriefing } from '@/lib/orchestration/workflows/intelligence-briefing-workflow';

export const runtime = 'nodejs';

/**
 * POST /api/v1/intelligence/brief
 * Manual "Ask AI to Analyze" — runs briefing for pending ingests (sync fallback if Inngest down).
 */
export async function POST() {
  const supabase = await createServerComponentClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  const workspaceId =
    membership?.workspace_id ?? process.env.NEXT_PUBLIC_DEFAULT_WORKSPACE_ID ?? null;

  if (!workspaceId) {
    return NextResponse.json({ error: 'No workspace membership found' }, { status: 403 });
  }

  try {
    await requestIntelligenceBriefing(workspaceId);
  } catch {
    // fall through to sync path
  }

  // Sync path ensures UI works without Inngest Cloud
  const result = await runBriefingForWorkspace(supabaseAdmin, workspaceId);

  return NextResponse.json({
    success: true,
    briefsCreated: result.briefsCreated,
    ingestIds: result.ingestIds,
  });
}
