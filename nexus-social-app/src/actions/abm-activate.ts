'use server';

import { getUserWorkspaceContext } from '@/lib/auth/server-session';
import { activateAbmPlaybook } from '@/lib/ai-cmo/abm/activate-playbook';

export async function activateAbmAccount(accountId: string): Promise<
  | { ok: true; jobId: string; pollUrl: string; objectivePreview: string }
  | { ok: false; error: string }
> {
  const { workspaceId, userId } = await getUserWorkspaceContext();
  const result = await activateAbmPlaybook({
    workspaceId,
    userId,
    accountId,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return {
    ok: true,
    jobId: result.jobId,
    pollUrl: result.pollUrl,
    objectivePreview: result.objectivePreview,
  };
}
