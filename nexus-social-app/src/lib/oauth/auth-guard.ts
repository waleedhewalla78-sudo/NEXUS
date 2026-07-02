import { createActionClient } from '@/lib/supabase/action';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function requireOAuthUser(): Promise<{ userId: string }> {
  const supabase = await createActionClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) {
    throw new Error('Unauthenticated');
  }

  return { userId: session.user.id };
}

export async function verifyWorkspaceMembership({
  userId,
  workspaceId,
}: {
  userId: string;
  workspaceId: string;
}): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('workspace_members')
    .select('id')
    .eq('user_id', userId)
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (error || !data) {
    throw new Error('Unauthorized: not a member of this workspace');
  }
}
