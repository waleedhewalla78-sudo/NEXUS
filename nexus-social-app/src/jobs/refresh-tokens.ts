import { supabaseAdmin } from '@/lib/supabase/server';
import { oauthTokenCrypto } from '@/lib/oauth/token-crypto';
import { getTokenRefresher } from '@/lib/oauth/token-refresh';
import type { OAuthPlatform } from '@/lib/oauth/types';
import { normalizePlatformName } from '@/lib/publishers/types';

const DEFAULT_REFRESH_WINDOW_HOURS = 48;

type ExpiringConnectionRow = {
  id: string;
  workspace_id: string;
  platform: string;
  access_token_enc: string;
  refresh_token_enc: string | null;
  token_iv: string;
  token_tag: string;
  token_expires_at: string;
  metadata: Record<string, unknown> | null;
};

function isTokenRefreshEnabled(): boolean {
  const flag = process.env.TOKEN_REFRESH_ENABLED ?? 'true';
  return flag.toLowerCase() !== 'false';
}

function resolveRefreshWindowMs(): number {
  const hours = Number(process.env.TOKEN_REFRESH_WINDOW_HOURS ?? DEFAULT_REFRESH_WINDOW_HOURS);
  if (!Number.isFinite(hours) || hours <= 0) {
    return DEFAULT_REFRESH_WINDOW_HOURS * 60 * 60 * 1000;
  }
  return hours * 60 * 60 * 1000;
}

function canRefreshPlatform(platform: OAuthPlatform): boolean {
  if (platform === 'linkedin') {
    return Boolean(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET);
  }
  if (platform === 'x') {
    return Boolean(process.env.X_CLIENT_ID && process.env.X_CLIENT_SECRET);
  }
  if (platform === 'facebook' || platform === 'instagram') {
    return Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET);
  }
  return false;
}

async function refreshConnection(row: ExpiringConnectionRow): Promise<{
  refreshed: boolean;
  skipped: boolean;
  error: boolean;
}> {
  const platform = normalizePlatformName(row.platform);
  if (!platform) {
    return { refreshed: false, skipped: true, error: false };
  }

  if (!canRefreshPlatform(platform)) {
    return { refreshed: false, skipped: true, error: false };
  }

  const tokens = oauthTokenCrypto.decryptConnectionTokens(row);
  const needsRefreshToken = platform === 'linkedin' || platform === 'x';
  if (needsRefreshToken && !tokens.refreshToken) {
    await supabaseAdmin
      .from('workspace_social_connections')
      .update({
        metadata: {
          ...(row.metadata ?? {}),
          refresh_error: 'Missing refresh token — reconnect account',
          refresh_error_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id);
    return { refreshed: false, skipped: false, error: true };
  }

  try {
    const refresher = getTokenRefresher(platform);
    const result = await refresher.refresh(tokens);
    const encryptedUpdate = oauthTokenCrypto.buildEncryptedConnectionUpdate({
      tokens: result,
      expiresAt: result.expiresAt,
      existingMetadata: row.metadata,
    });

    const { error } = await supabaseAdmin
      .from('workspace_social_connections')
      .update({
        ...encryptedUpdate,
        metadata: {
          ...encryptedUpdate.metadata,
          refresh_error: null,
          refresh_error_at: null,
        },
      })
      .eq('id', row.id);

    if (error) {
      throw new Error(error.message);
    }

    return { refreshed: true, skipped: false, error: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown token refresh error';
    console.error(`[RefreshTokens] connection=${row.id} platform=${platform}:`, message);
    await supabaseAdmin
      .from('workspace_social_connections')
      .update({
        metadata: {
          ...(row.metadata ?? {}),
          refresh_error: message.slice(0, 2000),
          refresh_error_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id);
    return { refreshed: false, skipped: false, error: true };
  }
}

export async function refreshExpiringTokens(): Promise<{
  processed: number;
  refreshed: number;
  skipped: number;
  errors: number;
}> {
  if (!isTokenRefreshEnabled()) {
    return { processed: 0, refreshed: 0, skipped: 0, errors: 0 };
  }

  const cutoff = new Date(Date.now() + resolveRefreshWindowMs()).toISOString();
  const { data, error } = await supabaseAdmin
    .from('workspace_social_connections')
    .select(
      'id, workspace_id, platform, access_token_enc, refresh_token_enc, token_iv, token_tag, token_expires_at, metadata',
    )
    .is('disconnected_at', null)
    .not('token_expires_at', 'is', null)
    .lte('token_expires_at', cutoff)
    .order('token_expires_at', { ascending: true })
    .limit(100);

  if (error) {
    throw new Error(`Failed to query expiring connections: ${error.message}`);
  }

  let refreshed = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of (data ?? []) as ExpiringConnectionRow[]) {
    const result = await refreshConnection(row);
    if (result.refreshed) refreshed += 1;
    if (result.skipped) skipped += 1;
    if (result.error) errors += 1;
  }

  return {
    processed: data?.length ?? 0,
    refreshed,
    skipped,
    errors,
  };
}

export const refreshTokensJob = {
  refreshExpiringTokens,
};
