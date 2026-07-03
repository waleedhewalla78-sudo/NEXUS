function requireEnv(name: string): string {
  const value = process.env[name] ?? '';
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export function getHubSpotRedirectUri(): string {
  return (
    process.env.HUBSPOT_OAUTH_REDIRECT_URI ??
    `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3005'}/api/oauth/hubspot/callback`
  );
}

/** Scopes for deal sync + webhook correlation (DEC-003: OAuth path). */
export const HUBSPOT_OAUTH_SCOPES = [
  'crm.objects.deals.read',
  'crm.objects.contacts.read',
  'crm.schemas.deals.read',
] as const;

export function buildHubSpotAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: requireEnv('HUBSPOT_CLIENT_ID'),
    redirect_uri: getHubSpotRedirectUri(),
    scope: HUBSPOT_OAUTH_SCOPES.join(' '),
    state,
  });
  return `https://app.hubspot.com/oauth/authorize?${params.toString()}`;
}

export type HubSpotTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
};

export async function exchangeHubSpotCode(code: string): Promise<HubSpotTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: requireEnv('HUBSPOT_CLIENT_ID'),
    client_secret: requireEnv('HUBSPOT_CLIENT_SECRET'),
    redirect_uri: getHubSpotRedirectUri(),
    code,
  });

  const response = await fetch('https://api.hubapi.com/oauth/v1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const payload = (await response.json()) as HubSpotTokenResponse & {
    status?: string;
    message?: string;
  };

  if (!response.ok || !payload.access_token) {
    throw new Error(payload.message ?? `HubSpot token exchange failed: HTTP ${response.status}`);
  }

  return payload;
}

export async function refreshHubSpotToken(refreshToken: string): Promise<HubSpotTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: requireEnv('HUBSPOT_CLIENT_ID'),
    client_secret: requireEnv('HUBSPOT_CLIENT_SECRET'),
    refresh_token: refreshToken,
  });

  const response = await fetch('https://api.hubapi.com/oauth/v1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const payload = (await response.json()) as HubSpotTokenResponse & { message?: string };
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.message ?? `HubSpot token refresh failed: HTTP ${response.status}`);
  }
  return payload;
}

export type HubSpotTokenMetadata = {
  hubId: number;
  hubDomain: string | null;
  userEmail: string | null;
};

export async function fetchHubSpotTokenMetadata(accessToken: string): Promise<HubSpotTokenMetadata> {
  const response = await fetch(
    `https://api.hubapi.com/oauth/v1/access-tokens/${encodeURIComponent(accessToken)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!response.ok) {
    throw new Error(`HubSpot token metadata failed: HTTP ${response.status}`);
  }

  const json = (await response.json()) as {
    hub_id?: number;
    hub_domain?: string;
    user?: string;
  };

  if (!json.hub_id) {
    throw new Error('HubSpot token metadata missing hub_id');
  }

  return {
    hubId: json.hub_id,
    hubDomain: json.hub_domain ?? null,
    userEmail: json.user ?? null,
  };
}

export const hubSpotOAuth = {
  buildHubSpotAuthorizationUrl,
  exchangeHubSpotCode,
  refreshHubSpotToken,
  fetchHubSpotTokenMetadata,
  getHubSpotRedirectUri,
};
