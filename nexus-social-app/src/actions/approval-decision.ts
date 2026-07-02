'use server';

import { revalidatePath } from 'next/cache';
import { getUserWorkspaceContext } from '@/lib/auth/server-session';
import { decideApprovalRequestViaReconciler } from '@/lib/ai-cmo/approval-service';

export async function decideApprovalFromSession(
  approvalId: string,
  decision: 'approved' | 'rejected',
): Promise<{ ok: boolean; error?: string }> {
  const { workspaceId, userId } = await getUserWorkspaceContext();

  const result = await decideApprovalRequestViaReconciler({
    workspaceId,
    userId,
    approvalId,
    status: decision,
  });

  if (!result.ok) {
    return { ok: false, error: result.error ?? 'Decision failed' };
  }

  revalidatePath('/ai-cmo/approvals');
  revalidatePath('/ai-ops');
  return { ok: true };
}
