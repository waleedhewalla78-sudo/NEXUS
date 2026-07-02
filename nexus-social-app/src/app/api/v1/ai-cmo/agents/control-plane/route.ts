import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase/action';
import { supabaseAdmin } from '@/lib/supabase/server';
import { queryControlPlaneSnapshot } from '@/lib/ai-cmo/agents/control-plane-query';
import { resolveAbmWorkspaceId } from '@/lib/ai-cmo/abm/resolve-abm-workspace';

/**
 * GET /api/v1/ai-cmo/agents/control-plane
 */
export async function GET(req: NextRequest) {
  const resolved = await resolveAbmWorkspaceId(req);
  if ('response' in resolved) return resolved.response;

  const supabase = resolved.useAdmin ? supabaseAdmin : await createServerComponentClient();
  const snapshot = await queryControlPlaneSnapshot(supabase, resolved.workspaceId);

  return NextResponse.json({
    ...snapshot,
    source: 'control_plane',
  });
}
