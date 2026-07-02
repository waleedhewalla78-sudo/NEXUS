import { redirect } from 'next/navigation';
import { createActionClient } from '@/lib/supabase/action';
import { supabaseAdmin } from '@/lib/supabase/server';
import type { Session } from '@supabase/supabase-js';

export interface WorkspaceContext {
  userId: string;
  workspaceId: string;
  session: Session;
}

export async function requireUserSession(): Promise<Session> {
  const supabase = await createActionClient();
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) {
    redirect('/login');
  }
  return session;
}

export async function getUserWorkspaceContext(): Promise<WorkspaceContext> {
  const session = await requireUserSession();

  const { data: membership } = await supabaseAdmin
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  const workspaceId =
    membership?.workspace_id ??
    process.env.NEXT_PUBLIC_DEFAULT_WORKSPACE_ID;

  if (!workspaceId) {
    throw new Error('No workspace membership found for user');
  }

  return { userId: session.user.id, workspaceId, session };
}

export async function getClientPortalContext(): Promise<{ userId: string; clientId: string; workspaceId: string }> {
  const session = await requireUserSession();

  const { data: clientUser, error } = await supabaseAdmin
    .from('client_users')
    .select('parent_client_id, workspace_id')
    .eq('user_id', session.user.id)
    .single();

  if (error || !clientUser) {
    throw new Error('Forbidden: not a client portal user');
  }

  return {
    userId: session.user.id,
    clientId: clientUser.parent_client_id,
    workspaceId: clientUser.workspace_id,
  };
}
