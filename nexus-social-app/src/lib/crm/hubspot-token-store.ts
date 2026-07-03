import { createClient } from '@supabase/supabase-js';
import { decryptToken, encryptToken } from '@/lib/crypto/token-vault';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export type HubSpotStoredTokens = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  portalId: string;
  oauthConnected: boolean;
};

function encryptField(plaintext: string): { enc: string; iv: string; tag: string } {
  const { ciphertext, iv, tag } = encryptToken(plaintext);
  return { enc: ciphertext, iv, tag };
}

function decryptField(enc: string, iv: string, tag: string): string {
  return decryptToken({ ciphertext: enc, iv, tag });
}

export async function saveHubSpotOAuthTokens(input: {
  workspaceId: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  portalId: string;
  hubDomain?: string | null;
  userEmail?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: existing } = await supabaseAdmin
    .from('workspaces')
    .select('branding')
    .eq('id', input.workspaceId)
    .maybeSingle();

  const branding = (existing?.branding as Record<string, unknown> | null) ?? {};
  const access = encryptField(input.accessToken);
  const refresh = input.refreshToken ? encryptField(input.refreshToken) : null;

  const hubspot: Record<string, unknown> = {
    portal_id: input.portalId,
    oauth_connected: true,
    hub_domain: input.hubDomain ?? null,
    connected_user_email: input.userEmail ?? null,
    access_token_enc: access.enc,
    token_iv: access.iv,
    token_tag: access.tag,
    token_expires_at: input.expiresAt?.toISOString() ?? null,
  };

  if (refresh) {
    hubspot.refresh_token_enc = refresh.enc;
    hubspot.refresh_token_iv = refresh.iv;
    hubspot.refresh_token_tag = refresh.tag;
  }

  const { error } = await supabaseAdmin
    .from('workspaces')
    .update({
      branding: {
        ...branding,
        hubspot,
      },
    })
    .eq('id', input.workspaceId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function getHubSpotAccessToken(workspaceId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('workspaces')
    .select('branding')
    .eq('id', workspaceId)
    .maybeSingle();

  const hubspot = (data?.branding as Record<string, unknown> | null)?.hubspot as
    | Record<string, unknown>
    | undefined;

  if (!hubspot?.oauth_connected) return null;

  const enc = hubspot.access_token_enc;
  const iv = hubspot.token_iv;
  const tag = hubspot.token_tag;
  if (typeof enc !== 'string' || typeof iv !== 'string' || typeof tag !== 'string') {
    return null;
  }

  try {
    return decryptField(enc, iv, tag);
  } catch {
    return null;
  }
}

export async function loadHubSpotStoredTokens(
  workspaceId: string,
): Promise<HubSpotStoredTokens | null> {
  const { data } = await supabaseAdmin
    .from('workspaces')
    .select('branding')
    .eq('id', workspaceId)
    .maybeSingle();

  const hubspot = (data?.branding as Record<string, unknown> | null)?.hubspot as
    | Record<string, unknown>
    | undefined;
  if (!hubspot) return null;

  const portalId = typeof hubspot.portal_id === 'string' ? hubspot.portal_id : '';
  const oauthConnected = hubspot.oauth_connected === true;

  if (!oauthConnected) {
    return { accessToken: '', refreshToken: null, expiresAt: null, portalId, oauthConnected: false };
  }

  const enc = hubspot.access_token_enc;
  const iv = hubspot.token_iv;
  const tag = hubspot.token_tag;
  if (typeof enc !== 'string' || typeof iv !== 'string' || typeof tag !== 'string') {
    return null;
  }

  let refreshToken: string | null = null;
  if (
    typeof hubspot.refresh_token_enc === 'string' &&
    typeof hubspot.refresh_token_iv === 'string' &&
    typeof hubspot.refresh_token_tag === 'string'
  ) {
    try {
      refreshToken = decryptField(
        hubspot.refresh_token_enc,
        hubspot.refresh_token_iv,
        hubspot.refresh_token_tag,
      );
    } catch {
      refreshToken = null;
    }
  }

  try {
    const accessToken = decryptField(enc, iv, tag);
    const expiresAt =
      typeof hubspot.token_expires_at === 'string' ? hubspot.token_expires_at : null;
    return { accessToken, refreshToken, expiresAt, portalId, oauthConnected: true };
  } catch {
    return null;
  }
}

/** Resolve token: workspace OAuth → env private app token. */
export async function resolveHubSpotAccessToken(workspaceId: string): Promise<string | null> {
  const fromWorkspace = await getHubSpotAccessToken(workspaceId);
  if (fromWorkspace) return fromWorkspace;
  return process.env.HUBSPOT_ACCESS_TOKEN ?? null;
}
