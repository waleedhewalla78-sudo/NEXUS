import type { OAuthPlatform, TokenRefreshResult, TokenRefresher } from './types';

function requireEnv(name: string): string {
  const value = process.env[name] ?? '';
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

function expiresAtFromSeconds(expiresIn: number | undefined): Date | null {
  if (!expiresIn || expiresIn <= 0) return null;
  return new Date(Date.now() + expiresIn * 1000);
}

async function parseOAuthError(response: Response, label: string): Promise<never> {
  let message = `${label} HTTP ${response.status}`;
  try {
    const body = (await response.json()) as {
      error?: string;
      error_description?: string;
      message?: string;
    };
    message =
      body.error_description ??
      body.message ??
      body.error ??
      message;
  } catch {
    // keep default message
  }
  throw new Error(message);
}

async function refreshLinkedInToken({
  refreshToken,
}: {
  accessToken: string;
  refreshToken: string | null;
}): Promise<TokenRefreshResult> {
  if (!refreshToken) {
    throw new Error('LinkedIn refresh requires a refresh token');
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: requireEnv('LINKEDIN_CLIENT_ID'),
    client_secret: requireEnv('LINKEDIN_CLIENT_SECRET'),
  });

  const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    await parseOAuthError(response, 'LinkedIn token refresh');
  }

  const payload = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
  };

  if (!payload.access_token) {
    throw new Error('LinkedIn token refresh returned no access_token');
  }

  return {
    accessToken: payload.access_token,
    expiresAt: expiresAtFromSeconds(payload.expires_in),
    refreshToken: payload.refresh_token ?? refreshToken,
  };
}

async function refreshXToken({
  refreshToken,
}: {
  accessToken: string;
  refreshToken: string | null;
}): Promise<TokenRefreshResult> {
  if (!refreshToken) {
    throw new Error('X refresh requires a refresh token');
  }

  const clientId = requireEnv('X_CLIENT_ID');
  const clientSecret = requireEnv('X_CLIENT_SECRET');
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
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

  if (!response.ok) {
    await parseOAuthError(response, 'X token refresh');
  }

  const payload = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
  };

  if (!payload.access_token) {
    throw new Error('X token refresh returned no access_token');
  }

  return {
    accessToken: payload.access_token,
    expiresAt: expiresAtFromSeconds(payload.expires_in),
    refreshToken: payload.refresh_token ?? refreshToken,
  };
}

async function refreshMetaToken({
  accessToken,
}: {
  accessToken: string;
  refreshToken: string | null;
}): Promise<TokenRefreshResult> {
  const graphVersion = process.env.FACEBOOK_GRAPH_API_VERSION ?? 'v21.0';
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: requireEnv('META_APP_ID'),
    client_secret: requireEnv('META_APP_SECRET'),
    fb_exchange_token: accessToken,
  });

  const response = await fetch(
    `https://graph.facebook.com/${graphVersion}/oauth/access_token?${params.toString()}`,
  );

  if (!response.ok) {
    await parseOAuthError(response, 'Meta token exchange');
  }

  const payload = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: { message?: string };
  };

  if (payload.error?.message) {
    throw new Error(payload.error.message);
  }

  if (!payload.access_token) {
    throw new Error('Meta token exchange returned no access_token');
  }

  return {
    accessToken: payload.access_token,
    expiresAt: expiresAtFromSeconds(payload.expires_in),
  };
}

const refreshers: Record<OAuthPlatform, TokenRefresher> = {
  linkedin: { refresh: refreshLinkedInToken },
  x: { refresh: refreshXToken },
  facebook: { refresh: refreshMetaToken },
  instagram: { refresh: refreshMetaToken },
  tiktok: {
    refresh: async () => {
      throw new Error('Token refresh not implemented for tiktok');
    },
  },
  snapchat: {
    refresh: async () => {
      throw new Error('Token refresh not implemented for snapchat');
    },
  },
};

export function getTokenRefresher(platform: OAuthPlatform): TokenRefresher {
  return refreshers[platform];
}

export const tokenRefreshUtils = {
  expiresAtFromSeconds,
  refreshLinkedInToken,
  refreshXToken,
  refreshMetaToken,
};
