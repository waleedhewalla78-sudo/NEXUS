import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import { decideApprovalRequestViaReconciler } from '@/lib/ai-cmo/approval-service';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateApiRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  let body: { decision?: 'approved' | 'rejected' };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (body.decision !== 'approved' && body.decision !== 'rejected') {
    return NextResponse.json({ error: 'decision must be approved or rejected' }, { status: 400 });
  }

  const userId = auth.requestHeaders.get('x-user-id') ?? `api-${auth.workspaceId}`;
  const result = await decideApprovalRequestViaReconciler({
    workspaceId: auth.workspaceId,
    userId,
    approvalId: id,
    status: body.decision,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json({ id: result.id, status: body.decision });
}
