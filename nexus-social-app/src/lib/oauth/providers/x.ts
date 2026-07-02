import { createHash, randomBytes } from 'node:crypto';

function requireEnv(name: string): string {
  const value = process.env[name] ?? '';
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

export function getXRedirectUri(): string {
  return (
    process.env.X_OAUTH_REDIRECT_URI ??
    `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3005'}/api/oauth/x/callback`
  );
}

export const X_SCOPES = ['tweet.read', 'tweet.write', 'users.read', 'offline.access'];

export function generatePkcePair(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = randomBytes(32).toString('base64url');
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
  return { codeVerifier, codeChallenge };
}

export function buildXAuthorizationUrl({
  state,
  codeChallenge,
}: {
  state: string;
  codeChallenge: string;
}): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: requireEnv('X_CLIENT_ID'),
    redirect_uri: getXRedirectUri(),
    scope: X_SCOPES.join(' '),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  return `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
}

export type XTokenResponse = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
};

export async function exchangeXCode({
  code,
  codeVerifier,
}: {
  code: string;
  codeVerifier: string;
}): Promise<XTokenResponse> {
  const clientId = requireEnv('X_CLIENT_ID');
  const clientSecret = requireEnv('X_CLIENT_SECRET');
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: getXRedirectUri(),
    code_verifier: codeVerifier,
    client_id: clientId,
  });

  const response = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basicAuth}`,
    },
    body,
  });

  const payload = (await response.json()) as XTokenResponse & {
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description ?? payload.error ?? `X token exchange failed: HTTP ${response.status}`);
  }

  return payload;
}

export async function resolveXAccount(accessToken: string): Promise<{
  accountId: string;
  accountName: string | null;
  accountHandle: string | null;
}> {
  const response = await fetch('https://api.twitter.com/2/users/me?user.fields=name,username', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const payload = (await response.json()) as {
    data?: { id?: string; name?: string; username?: string };
    errors?: Array<{ detail?: string }>;
  };

  if (!response.ok || !payload.data?.id) {
    const detail = payload.errors?.[0]?.detail ?? `X profile lookup failed: HTTP ${response.status}`;
    throw new Error(detail);
  }

  return {
    accountId: payload.data.id,
    accountName: payload.data.name ?? null,
    accountHandle: payload.data.username ? `@${payload.data.username}` : null,
  };
}

export const xOAuth = {
  buildXAuthorizationUrl,
  exchangeXCode,
  resolveXAccount,
  generatePkcePair,
  getXRedirectUri,
};
