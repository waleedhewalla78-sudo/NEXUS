import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { createApprovalRequestViaReconciler } from '@/lib/ai-cmo/approval-service';

export async function GET(req: NextRequest) {
  const auth = await authenticateApiRequest(req);
  if (!auth.ok) return auth.response;

  const status = req.nextUrl.searchParams.get('status') ?? 'pending';

  const { data, error } = await supabaseAdmin
    .from('ai_cmo_approval_requests')
    .select(
      'id, campaign_id, content_id, severity, status, reason, sla_due_at, created_at, decided_at',
    )
    .eq('workspace_id', auth.workspaceId)
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    const missingTable =
      error.message.includes('does not exist') || error.code === '42P01' || error.code === 'PGRST205';
    if (missingTable) {
      return NextResponse.json({
        data: [],
        warning: 'approval_queue_not_migrated',
      });
    }
    return NextResponse.json({ error: 'Failed to fetch approvals' }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await authenticateApiRequest(req);
  if (!auth.ok) return auth.response;

  let body: {
    campaignId?: string;
    contentId?: string;
    severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    reason?: string;
    payload?: Record<string, unknown>;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.reason?.trim()) {
    return NextResponse.json({ error: 'reason is required' }, { status: 400 });
  }

  const userId = auth.requestHeaders.get('x-user-id') ?? `api-${auth.workspaceId}`;
  const result = await createApprovalRequestViaReconciler({
    workspaceId: auth.workspaceId,
    userId,
    campaignId: body.campaignId ?? null,
    contentId: body.contentId ?? null,
    severity: body.severity ?? 'MEDIUM',
    reason: body.reason.trim(),
    payload: body.payload,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json({ id: result.id, status: 'pending' }, { status: 201 });
}
