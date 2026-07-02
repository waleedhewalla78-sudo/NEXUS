import { NextResponse } from 'next/server';
import { verifyApprovalToken } from '@/lib/approval-token';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    const action = searchParams.get('action');
    const sig = searchParams.get('sig');

    if (!token || !action || !sig) {
      return NextResponse.json({ error: 'Missing token, action, or signature parameters' }, { status: 400 });
    }

    const verification = verifyApprovalToken({ token, sig });
    if (!verification.valid) {
      const status = verification.error === 'Server configuration error' ? 500 : 403;
      return NextResponse.json({ error: verification.error }, { status });
    }

    const { workspaceId, conversationId } = verification;

    if (action === 'reject') {
      return NextResponse.json({ status: 'rejected', message: 'The refund has been canceled.' });
    }

    if (action === 'approve') {
      console.log(`[HITL Executed] Refund approved for Workspace: ${workspaceId}, Conversation: ${conversationId}`);
      return NextResponse.json({
        status: 'success',
        message: 'Refund successfully executed and processed in the payment gateway.',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: unknown) {
    console.error('[Tool: approve-refund]', error);
    return NextResponse.json({ error: 'Internal approval error' }, { status: 500 });
  }
}
