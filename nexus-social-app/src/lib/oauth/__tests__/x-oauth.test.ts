import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createOAuthState, verifyOAuthState } from '@/lib/oauth/state';
import {
  buildXAuthorizationUrl,
  exchangeXCode,
  generatePkcePair,
  getXRedirectUri,
  resolveXAccount,
} from '@/lib/oauth/providers/x';

describe('x oauth provider', () => {
  beforeEach(() => {
    process.env.APPROVAL_HMAC_SECRET = 'test-oauth-state-secret-min-32-chars!!';
    process.env.X_CLIENT_ID = 'x-client-id';
    process.env.X_CLIENT_SECRET = 'x-client-secret';
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3005';
    vi.restoreAllMocks();
  });

  it('stores PKCE verifier in signed OAuth state', () => {
    const { codeVerifier, codeChallenge } = generatePkcePair();
    const state = createOAuthState({
      workspaceId: 'ws-123',
      userId: 'user-456',
      platform: 'x',
      codeVerifier,
    });

    const payload = verifyOAuthState(state);
    expect(payload.codeVerifier).toBe(codeVerifier);
    expect(codeChallenge).toHaveLength(43);
  });

  it('builds authorization URL with PKCE challenge', () => {
    const { codeChallenge } = generatePkcePair();
    const url = new URL(buildXAuthorizationUrl({ state: 'signed-state', codeChallenge }));
    expect(url.origin).toBe('https://twitter.com');
    expect(url.pathname).toBe('/i/oauth2/authorize');
    expect(url.searchParams.get('client_id')).toBe('x-client-id');
    expect(url.searchParams.get('redirect_uri')).toBe(getXRedirectUri());
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('code_challenge')).toBe(codeChallenge);
  });

  it('exchanges authorization code with PKCE verifier', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: 'x-access',
          expires_in: 7200,
          refresh_token: 'x-refresh',
          scope: 'tweet.write users.read',
        }),
        { status: 200 },
      ),
    );

    const tokens = await exchangeXCode({ code: 'auth-code', codeVerifier: 'verifier-123' });
    expect(tokens.access_token).toBe('x-access');
    expect(tokens.refresh_token).toBe('x-refresh');
  });

  it('resolves X account from users/me', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { id: '998877', name: 'Nexus Social', username: 'nexus_social' },
        }),
        { status: 200 },
      ),
    );

    const account = await resolveXAccount('token');
    expect(account.accountId).toBe('998877');
    expect(account.accountHandle).toBe('@nexus_social');
  });
});
