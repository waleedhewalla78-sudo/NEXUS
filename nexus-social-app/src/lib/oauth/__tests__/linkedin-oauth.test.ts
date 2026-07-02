import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createOAuthState, verifyOAuthState } from '@/lib/oauth/state';
import {
  buildLinkedInAuthorizationUrl,
  exchangeLinkedInCode,
  getLinkedInRedirectUri,
  resolveLinkedInAccount,
} from '@/lib/oauth/providers/linkedin';

describe('oauth state', () => {
  beforeEach(() => {
    process.env.APPROVAL_HMAC_SECRET = 'test-oauth-state-secret-min-32-chars!!';
  });

  it('round-trips signed OAuth state', () => {
    const state = createOAuthState({
      workspaceId: 'ws-123',
      userId: 'user-456',
      platform: 'linkedin',
    });

    const payload = verifyOAuthState(state);
    expect(payload.workspaceId).toBe('ws-123');
    expect(payload.userId).toBe('user-456');
    expect(payload.platform).toBe('linkedin');
  });

  it('rejects tampered OAuth state', () => {
    const state = createOAuthState({
      workspaceId: 'ws-123',
      userId: 'user-456',
      platform: 'linkedin',
    });
    const tampered = `${state}x`;
    expect(() => verifyOAuthState(tampered)).toThrow();
  });
});

describe('linkedin oauth provider', () => {
  beforeEach(() => {
    process.env.LINKEDIN_CLIENT_ID = 'linkedin-client-id';
    process.env.LINKEDIN_CLIENT_SECRET = 'linkedin-client-secret';
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3005';
    vi.restoreAllMocks();
  });

  it('builds authorization URL with redirect and scopes', () => {
    const url = new URL(buildLinkedInAuthorizationUrl('signed-state'));
    expect(url.origin).toBe('https://www.linkedin.com');
    expect(url.pathname).toBe('/oauth/v2/authorization');
    expect(url.searchParams.get('client_id')).toBe('linkedin-client-id');
    expect(url.searchParams.get('redirect_uri')).toBe(getLinkedInRedirectUri());
    expect(url.searchParams.get('state')).toBe('signed-state');
    expect(url.searchParams.get('scope')).toContain('w_organization_social');
  });

  it('exchanges authorization code for tokens', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: 'li-access',
          expires_in: 3600,
          refresh_token: 'li-refresh',
          scope: 'openid profile',
        }),
        { status: 200 },
      ),
    );

    const tokens = await exchangeLinkedInCode('auth-code');
    expect(tokens.access_token).toBe('li-access');
    expect(tokens.refresh_token).toBe('li-refresh');
  });

  it('resolves organization account when admin ACL exists', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          elements: [
            {
              organization: {
                id: 12345,
                localizedName: 'Nexus Social',
                vanityName: 'nexus-social',
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const account = await resolveLinkedInAccount('token');
    expect(account.accountId).toBe('12345');
    expect(account.authorUrn).toBe('urn:li:organization:12345');
  });
});
