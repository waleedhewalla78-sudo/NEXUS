'use server';

import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase/server';
import { createActionClient } from '@/lib/supabase/action';

export interface SsoConfig {
  provider: 'saml' | 'oauth';
  oauth_client_id: string;
  oauth_client_secret: string;
  metadata_url: string;
  is_enabled: boolean;
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

export async function getSsoConfig(workspaceId: string): Promise<SsoConfig | null> {
  const supabase = await createActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabaseAdmin
    .from('workspace_sso_configs')
    .select('provider, oauth_client_id, oauth_client_secret, metadata_url, is_enabled')
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (error?.code === '42P01' || error?.code === 'PGRST205') return null;
  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    provider: (data.provider as 'saml' | 'oauth') ?? 'saml',
    oauth_client_id: (data.oauth_client_id as string) ?? '',
    oauth_client_secret: (data.oauth_client_secret as string) ?? '',
    metadata_url: (data.metadata_url as string) ?? '',
    is_enabled: Boolean(data.is_enabled),
  };
}

export async function saveSsoConfig(workspaceId: string, config: SsoConfig) {
  const supabase = await createActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthenticated');

  await requireAdmin(workspaceId, user.id);

  const { error } = await supabaseAdmin.from('workspace_sso_configs').upsert(
    {
      workspace_id: workspaceId,
      provider: config.provider,
      oauth_client_id: config.oauth_client_id || null,
      oauth_client_secret: config.oauth_client_secret || null,
      metadata_url: config.metadata_url || null,
      is_enabled: config.is_enabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'workspace_id' },
  );

  if (error?.code === '42P01' || error?.code === 'PGRST205') {
    throw new Error('Run schema_patch.sql to enable SSO configuration storage.');
  }
  if (error) throw new Error(error.message);

  revalidatePath('/settings/sso');
}
