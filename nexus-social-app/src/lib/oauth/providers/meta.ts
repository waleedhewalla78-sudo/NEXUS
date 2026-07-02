function requireEnv(name: string): string {
  const value = process.env[name] ?? '';
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

const GRAPH_VERSION = process.env.FACEBOOK_GRAPH_API_VERSION ?? 'v21.0';

export function getMetaRedirectUri(): string {
  return (
    process.env.META_OAUTH_REDIRECT_URI ??
    `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3005'}/api/oauth/meta/callback`
  );
}

export const META_SCOPES = [
  'pages_manage_posts',
  'pages_read_engagement',
  'pages_show_list',
  'instagram_basic',
  'instagram_content_publish',
];

export function buildMetaAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: requireEnv('META_APP_ID'),
    redirect_uri: getMetaRedirectUri(),
    state,
    scope: META_SCOPES.join(','),
    response_type: 'code',
  });
  return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params.toString()}`;
}

export type MetaTokenResponse = {
  access_token: string;
  expires_in?: number;
  token_type?: string;
};

export async function exchangeMetaCode(code: string): Promise<MetaTokenResponse> {
  const params = new URLSearchParams({
    client_id: requireEnv('META_APP_ID'),
    client_secret: requireEnv('META_APP_SECRET'),
    redirect_uri: getMetaRedirectUri(),
    code,
  });

  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token?${params.toString()}`,
  );

  const payload = (await response.json()) as MetaTokenResponse & {
    error?: { message?: string };
  };

  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error?.message ?? `Meta token exchange failed: HTTP ${response.status}`);
  }

  return payload;
}

export async function exchangeMetaLongLivedToken(shortLivedToken: string): Promise<MetaTokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: requireEnv('META_APP_ID'),
    client_secret: requireEnv('META_APP_SECRET'),
    fb_exchange_token: shortLivedToken,
  });

  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token?${params.toString()}`,
  );

  const payload = (await response.json()) as MetaTokenResponse & {
    error?: { message?: string };
  };

  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error?.message ?? `Meta long-lived token exchange failed: HTTP ${response.status}`);
  }

  return payload;
}

export type MetaPageAccount = {
  platform: 'facebook' | 'instagram';
  accountId: string;
  accountName: string | null;
  accountHandle: string | null;
  pageAccessToken: string;
  metadata: Record<string, unknown>;
};

export async function resolveMetaPageAccounts(userAccessToken: string): Promise<MetaPageAccount[]> {
  const params = new URLSearchParams({
    fields: 'id,name,access_token,instagram_business_account{id,username}',
    access_token: userAccessToken,
  });

  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/me/accounts?${params.toString()}`,
  );

  const payload = (await response.json()) as {
    data?: Array<{
      id?: string;
      name?: string;
      access_token?: string;
      instagram_business_account?: { id?: string; username?: string };
    }>;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(payload.error?.message ?? `Meta pages lookup failed: HTTP ${response.status}`);
  }

  const accounts: MetaPageAccount[] = [];

  for (const page of payload.data ?? []) {
    if (!page.id || !page.access_token) continue;

    accounts.push({
      platform: 'facebook',
      accountId: page.id,
      accountName: page.name ?? null,
      accountHandle: page.name ?? null,
      pageAccessToken: page.access_token,
      metadata: {
        oauth_provider: 'meta',
        page_id: page.id,
      },
    });

    const igAccount = page.instagram_business_account;
    if (igAccount?.id) {
      accounts.push({
        platform: 'instagram',
        accountId: igAccount.id,
        accountName: igAccount.username ? `@${igAccount.username}` : page.name ?? null,
        accountHandle: igAccount.username ? `@${igAccount.username}` : null,
        pageAccessToken: page.access_token,
        metadata: {
          oauth_provider: 'meta',
          page_id: page.id,
          instagram_business_account_id: igAccount.id,
        },
      });
    }
  }

  if (accounts.length === 0) {
    throw new Error('No Facebook Pages found for this Meta account');
  }

  return accounts;
}

export const metaOAuth = {
  buildMetaAuthorizationUrl,
  exchangeMetaCode,
  exchangeMetaLongLivedToken,
  resolveMetaPageAccounts,
  getMetaRedirectUri,
};
