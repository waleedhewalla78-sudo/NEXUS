import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  buildMetaAuthorizationUrl,
  exchangeMetaCode,
  exchangeMetaLongLivedToken,
  getMetaRedirectUri,
  resolveMetaPageAccounts,
} from '@/lib/oauth/providers/meta';

describe('meta oauth provider', () => {
  beforeEach(() => {
    process.env.META_APP_ID = 'meta-app-id';
    process.env.META_APP_SECRET = 'meta-app-secret';
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3005';
    vi.restoreAllMocks();
  });

  it('builds Meta authorization URL with redirect and scopes', () => {
    const url = new URL(buildMetaAuthorizationUrl('signed-state'));
    expect(url.hostname).toBe('www.facebook.com');
    expect(url.searchParams.get('client_id')).toBe('meta-app-id');
    expect(url.searchParams.get('redirect_uri')).toBe(getMetaRedirectUri());
    expect(url.searchParams.get('state')).toBe('signed-state');
    expect(url.searchParams.get('scope')).toContain('pages_manage_posts');
  });

  it('exchanges authorization code for short-lived token', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ access_token: 'short-token', expires_in: 3600 }), { status: 200 }),
    );

    const tokens = await exchangeMetaCode('auth-code');
    expect(tokens.access_token).toBe('short-token');
  });

  it('exchanges short-lived token for long-lived token', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ access_token: 'long-token', expires_in: 5184000 }), { status: 200 }),
    );

    const tokens = await exchangeMetaLongLivedToken('short-token');
    expect(tokens.access_token).toBe('long-token');
  });

  it('resolves Facebook and Instagram page accounts', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              id: 'page-123',
              name: 'Nexus Page',
              access_token: 'page-token',
              instagram_business_account: { id: 'ig-456', username: 'nexus_social' },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const accounts = await resolveMetaPageAccounts('user-token');
    expect(accounts).toHaveLength(2);
    expect(accounts[0]?.platform).toBe('facebook');
    expect(accounts[0]?.accountId).toBe('page-123');
    expect(accounts[1]?.platform).toBe('instagram');
    expect(accounts[1]?.accountId).toBe('ig-456');
  });
});
