function requireEnv(name: string): string {
  const value = process.env[name] ?? '';
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

export function getLinkedInRedirectUri(): string {
  return (
    process.env.LINKEDIN_OAUTH_REDIRECT_URI ??
    `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3005'}/api/oauth/linkedin/callback`
  );
}

export const LINKEDIN_SCOPES = ['openid', 'profile', 'w_organization_social', 'r_organization_admin'];

export function buildLinkedInAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: requireEnv('LINKEDIN_CLIENT_ID'),
    redirect_uri: getLinkedInRedirectUri(),
    state,
    scope: LINKEDIN_SCOPES.join(' '),
  });
  return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
}

export type LinkedInTokenResponse = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
};

export async function exchangeLinkedInCode(code: string): Promise<LinkedInTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: getLinkedInRedirectUri(),
    client_id: requireEnv('LINKEDIN_CLIENT_ID'),
    client_secret: requireEnv('LINKEDIN_CLIENT_SECRET'),
  });

  const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const payload = (await response.json()) as LinkedInTokenResponse & {
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description ?? payload.error ?? `LinkedIn token exchange failed: HTTP ${response.status}`);
  }

  return payload;
}

type LinkedInOrganization = {
  accountId: string;
  accountName: string | null;
  accountHandle: string | null;
  authorUrn: string;
};

async function fetchLinkedInOrganization(accessToken: string): Promise<LinkedInOrganization | null> {
  const response = await fetch(
    'https://api.linkedin.com/v2/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&projection=(elements*(organization~(localizedName,vanityName,id)))',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
      },
    },
  );

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    elements?: Array<{
      organization?: {
        localizedName?: string;
        vanityName?: string;
        id?: number;
      };
    }>;
  };

  const org = payload.elements?.[0]?.organization;
  if (!org?.id) {
    return null;
  }

  return {
    accountId: String(org.id),
    accountName: org.localizedName ?? null,
    accountHandle: org.vanityName ?? null,
    authorUrn: `urn:li:organization:${org.id}`,
  };
}

async function fetchLinkedInProfile(accessToken: string): Promise<LinkedInOrganization> {
  const response = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`LinkedIn profile lookup failed: HTTP ${response.status}`);
  }

  const profile = (await response.json()) as {
    sub?: string;
    name?: string;
    preferred_username?: string;
  };

  if (!profile.sub) {
    throw new Error('LinkedIn profile response missing subject id');
  }

  return {
    accountId: profile.sub,
    accountName: profile.name ?? null,
    accountHandle: profile.preferred_username ?? null,
    authorUrn: `urn:li:person:${profile.sub}`,
  };
}

export async function resolveLinkedInAccount(accessToken: string): Promise<LinkedInOrganization> {
  const organization = await fetchLinkedInOrganization(accessToken);
  if (organization) {
    return organization;
  }
  return fetchLinkedInProfile(accessToken);
}

export const linkedInOAuth = {
  buildLinkedInAuthorizationUrl,
  exchangeLinkedInCode,
  resolveLinkedInAccount,
  getLinkedInRedirectUri,
};
