'use server';

import { revalidatePath } from 'next/cache';
import { createActionClient } from '@/lib/supabase/action';
import { supabaseAdmin } from '@/lib/supabase/server';

export type MemberRole = 'owner' | 'admin' | 'member';

export interface TeamMember {
  id: string;
  user_id: string;
  email: string;
  role: MemberRole;
  created_at: string;
}

async function requireAdmin(workspaceId: string, userId: string) {
  const { data: member } = await supabaseAdmin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single();

  if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
    throw new Error('Forbidden: admin role required');
  }
}

export async function listTeamMembers(workspaceId: string): Promise<TeamMember[]> {
  const supabase = await createActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthenticated');

  const { data: self } = await supabaseAdmin
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!self) throw new Error('Unauthorized');

  const { data: members, error } = await supabaseAdmin
    .from('workspace_members')
    .select('id, user_id, role, created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);

  const userIds = (members ?? []).map((m) => m.user_id);
  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, email')
    .in('id', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000']);

  const emailById = new Map((users ?? []).map((u) => [u.id as string, u.email as string]));

  return (members ?? []).map((m) => ({
    id: m.id as string,
    user_id: m.user_id as string,
    email: emailById.get(m.user_id as string) ?? 'Unknown',
    role: m.role as MemberRole,
    created_at: m.created_at as string,
  }));
}

export async function updateMemberRole(workspaceId: string, memberId: string, role: MemberRole) {
  const supabase = await createActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthenticated');

  await requireAdmin(workspaceId, user.id);
  if (role === 'owner') throw new Error('Transfer ownership is not supported in this UI yet.');

  const { error } = await supabaseAdmin
    .from('workspace_members')
    .update({ role })
    .eq('id', memberId)
    .eq('workspace_id', workspaceId);

  if (error) throw new Error(error.message);
  revalidatePath('/settings/team');
}

export async function addTeamMemberByEmail(workspaceId: string, email: string, role: MemberRole) {
  const supabase = await createActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthenticated');

  await requireAdmin(workspaceId, user.id);
  if (role === 'owner') throw new Error('Cannot assign owner role via invite.');

  const normalized = email.trim().toLowerCase();
  const { data: targetUser } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', normalized)
    .maybeSingle();

  if (targetUser?.id) {
    const { error } = await supabaseAdmin.from('workspace_members').upsert(
      { user_id: targetUser.id, workspace_id: workspaceId, role },
      { onConflict: 'user_id,workspace_id' },
    );
    if (error) throw new Error(error.message);
    revalidatePath('/settings/team');
    return { status: 'added' as const };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3005';
  const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(normalized, {
    redirectTo: `${appUrl}/login`,
  });

  if (inviteError && !inviteError.message.toLowerCase().includes('already')) {
    throw new Error(inviteError.message);
  }

  const { error: pendingError } = await supabaseAdmin.from('workspace_invites').upsert(
    {
      workspace_id: workspaceId,
      email: normalized,
      role,
      invited_by: user.id,
      status: 'pending',
    },
    { onConflict: 'workspace_id,email' },
  );

  if (pendingError?.code === '42P01' || pendingError?.code === 'PGRST205') {
    throw new Error('User must sign up first, or run schema_patch.sql to enable email invites.');
  }
  if (pendingError) throw new Error(pendingError.message);

  revalidatePath('/settings/team');
  return { status: 'invited' as const };
}

export interface PendingInvite {
  id: string;
  email: string;
  role: MemberRole;
  status: string;
  created_at: string;
}

export async function listPendingInvites(workspaceId: string): Promise<PendingInvite[]> {
  const supabase = await createActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthenticated');

  await requireAdmin(workspaceId, user.id);

  const { data, error } = await supabaseAdmin
    .from('workspace_invites')
    .select('id, email, role, status, created_at')
    .eq('workspace_id', workspaceId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error?.code === '42P01' || error?.code === 'PGRST205') return [];
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    email: row.email as string,
    role: row.role as MemberRole,
    status: row.status as string,
    created_at: row.created_at as string,
  }));
}

export async function acceptPendingInvites(userId: string, email: string) {
  const normalized = email.trim().toLowerCase();
  const { data: invites, error } = await supabaseAdmin
    .from('workspace_invites')
    .select('id, workspace_id, role')
    .eq('email', normalized)
    .eq('status', 'pending');

  if (error?.code === '42P01' || error?.code === 'PGRST205') return;
  if (error || !invites?.length) return;

  for (const invite of invites) {
    await supabaseAdmin.from('workspace_members').upsert(
      {
        user_id: userId,
        workspace_id: invite.workspace_id as string,
        role: invite.role as MemberRole,
      },
      { onConflict: 'user_id,workspace_id' },
    );
    await supabaseAdmin
      .from('workspace_invites')
      .update({ status: 'accepted' })
      .eq('id', invite.id);
  }
}
