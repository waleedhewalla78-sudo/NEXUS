'use server';

import { createActionClient } from '@/lib/supabase/action';
import { supabaseAdmin } from '@/lib/supabase/server';
import { ensureDefaultAiAgentConfig } from '@/actions/ai-agent-settings';
import { acceptPendingInvites } from '@/actions/team-management';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface UserWorkspace {
  id: string;
  name: string;
}

export type ListWorkspacesResult = {
  workspaces: UserWorkspace[];
  error?: string;
  needsDatabaseSetup?: boolean;
};

function classifyError(message: string, code?: string): { message: string; needsDatabaseSetup: boolean } {
  const lower = message.toLowerCase();
  const needsDatabaseSetup =
    lower.includes('could not find the table') ||
    lower.includes('schema cache') ||
    (lower.includes('relation') && lower.includes('does not exist'));

  if (needsDatabaseSetup) {
    return {
      message: 'Database tables missing. Run src/sql/essential_bootstrap.sql in Supabase SQL Editor.',
      needsDatabaseSetup: true,
    };
  }

  if (code === '42703' || lower.includes('column') && lower.includes('does not exist')) {
    return {
      message:
        'Database schema out of date (error 42703). Run src/sql/schema_patch.sql in Supabase SQL Editor, then hard-refresh.',
      needsDatabaseSetup: true,
    };
  }

  return { message, needsDatabaseSetup: false };
}

async function ensureUserRecord(userId: string, email: string) {
  const payload = { id: userId, email: email || `${userId}@local.nexus` };

  const { error: adminError } = await supabaseAdmin
    .from('users')
    .upsert(payload, { onConflict: 'id' });

  if (!adminError) return;

  const userClient = await createActionClient();
  const { error: userError } = await userClient.from('users').upsert(payload, { onConflict: 'id' });

  if (userError) {
    console.warn('[ensure-workspace] users upsert:', adminError.message, userError.message);
  }
}

async function fetchMemberships(
  client: SupabaseClient,
  userId: string,
): Promise<ListWorkspacesResult> {
  const { data: members, error: memberError } = await client
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', userId);

  if (memberError) {
    const classified = classifyError(memberError.message, memberError.code);
    return { workspaces: [], error: classified.message, needsDatabaseSetup: classified.needsDatabaseSetup };
  }

  const workspaceIds = (members ?? []).map((m) => m.workspace_id).filter(Boolean);
  if (workspaceIds.length === 0) {
    return { workspaces: [] };
  }

  const { data: workspaces, error: wsError } = await client
    .from('workspaces')
    .select('id, name')
    .in('id', workspaceIds);

  if (wsError) {
    const classified = classifyError(wsError.message, wsError.code);
    return { workspaces: [], error: classified.message, needsDatabaseSetup: classified.needsDatabaseSetup };
  }

  const mapped = (workspaces ?? [])
    .map((ws) => ({ id: ws.id as string, name: ws.name as string }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { workspaces: mapped };
}

async function insertMembership(userId: string, workspaceId: string) {
  const payload = { user_id: userId, workspace_id: workspaceId, role: 'owner' as const };

  const { error: adminError } = await supabaseAdmin
    .from('workspace_members')
    .upsert(payload, { onConflict: 'user_id,workspace_id' });

  if (!adminError) return true;

  const userClient = await createActionClient();
  const { error: userError } = await userClient
    .from('workspace_members')
    .upsert(payload, { onConflict: 'user_id,workspace_id' });

  if (userError) {
    console.error('[ensure-workspace] membership upsert:', adminError.message, userError.message);
    return false;
  }
  return true;
}

async function provisionDefaultWorkspace(userId: string, email: string): Promise<string | null> {
  const localPart = email.split('@')[0]?.trim() || 'My';
  const name = `${localPart.charAt(0).toUpperCase()}${localPart.slice(1)} Workspace`;
  const slug = `ws-${userId.replace(/-/g, '').slice(0, 12)}`;

  const { data: existing } = await supabaseAdmin
    .from('workspaces')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (existing?.id) {
    await insertMembership(userId, existing.id);
    await ensureDefaultAiAgentConfig(existing.id);
    return existing.id;
  }

  const { data: adminWs, error: adminWsError } = await supabaseAdmin
    .from('workspaces')
    .insert({ name, slug })
    .select('id')
    .single();

  if (!adminWsError && adminWs?.id) {
    await insertMembership(userId, adminWs.id);
    await ensureDefaultAiAgentConfig(adminWs.id as string);
    return adminWs.id as string;
  }

  const userClient = await createActionClient();
  const { data: userWs, error: userWsError } = await userClient
    .from('workspaces')
    .insert({ name, slug })
    .select('id')
    .single();

  if (userWsError || !userWs?.id) {
    console.error('[ensure-workspace] workspace insert:', adminWsError?.message, userWsError?.message);
    return null;
  }

  await insertMembership(userId, userWs.id as string);
  await ensureDefaultAiAgentConfig(userWs.id as string);
  return userWs.id as string;
}

/**
 * Returns workspaces for the signed-in user, auto-creating a default workspace
 * when none exist (first login after sign-up).
 */
export async function listUserWorkspaces(): Promise<ListWorkspacesResult> {
  const supabase = await createActionClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { workspaces: [], error: userError?.message ?? 'Not signed in' };
  }

  await ensureUserRecord(user.id, user.email ?? '');
  if (user.email) {
    await acceptPendingInvites(user.id, user.email);
  }

  let result = await fetchMemberships(supabaseAdmin, user.id);
  if (result.needsDatabaseSetup) {
    return { workspaces: [], error: result.error, needsDatabaseSetup: true };
  }
  if (result.workspaces.length === 0 && !result.error) {
    result = await fetchMemberships(supabase, user.id);
  }

  if (result.workspaces.length === 0 && !result.error) {
    const workspaceId = await provisionDefaultWorkspace(user.id, user.email ?? '');
    if (!workspaceId) {
      return {
        workspaces: [],
        error: 'Could not create a workspace. Run src/sql/essential_bootstrap.sql in Supabase SQL Editor.',
      };
    }

    result = await fetchMemberships(supabaseAdmin, user.id);
    if (result.workspaces.length === 0) {
      result = await fetchMemberships(supabase, user.id);
    }
    if (result.workspaces.length === 0) {
      const { data: ws } = await supabaseAdmin
        .from('workspaces')
        .select('id, name')
        .eq('id', workspaceId)
        .maybeSingle();
      if (ws) {
        result = { workspaces: [{ id: ws.id, name: ws.name }] };
      }
    }
  }

  return result;
}