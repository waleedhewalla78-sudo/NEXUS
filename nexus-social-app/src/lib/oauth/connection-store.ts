import { encryptToken } from '@/lib/crypto/token-vault';
import { supabaseAdmin } from '@/lib/supabase/server';
import type { OAuthPlatform } from './types';

export type StoredOAuthConnection = {
  workspaceId: string;
  platform: OAuthPlatform;
  accountId: string;
  accountName: string | null;
  accountHandle: string | null;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  scopes: string[];
  metadata: Record<string, unknown>;
};

export async function upsertSocialConnection(connection: StoredOAuthConnection): Promise<{ id: string }> {
  const accessEncrypted = encryptToken(connection.accessToken);
  const metadata: Record<string, unknown> = { ...connection.metadata };

  let refreshTokenEnc: string | null = null;
  if (connection.refreshToken) {
    const refreshEncrypted = encryptToken(connection.refreshToken);
    refreshTokenEnc = refreshEncrypted.ciphertext;
    metadata.refresh_token_iv = refreshEncrypted.iv;
    metadata.refresh_token_tag = refreshEncrypted.tag;
  }

  const now = new Date().toISOString();

  await supabaseAdmin
    .from('workspace_social_connections')
    .update({ disconnected_at: now, updated_at: now })
    .eq('workspace_id', connection.workspaceId)
    .eq('platform', connection.platform)
    .eq('account_id', connection.accountId)
    .is('disconnected_at', null);

  const { data, error } = await supabaseAdmin
    .from('workspace_social_connections')
    .insert({
      workspace_id: connection.workspaceId,
      platform: connection.platform,
      account_id: connection.accountId,
      account_name: connection.accountName,
      account_handle: connection.accountHandle,
      access_token_enc: accessEncrypted.ciphertext,
      refresh_token_enc: refreshTokenEnc,
      token_iv: accessEncrypted.iv,
      token_tag: accessEncrypted.tag,
      token_expires_at: connection.expiresAt ? connection.expiresAt.toISOString() : null,
      scopes: connection.scopes,
      metadata,
      connected_at: now,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to store social connection');
  }

  return { id: data.id as string };
}
