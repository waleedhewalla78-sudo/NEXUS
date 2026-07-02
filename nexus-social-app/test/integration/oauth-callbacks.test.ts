import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/oauth/connection-store', () => ({
  upsertSocialConnection: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/oauth/providers/linkedin', () => ({
  linkedInOAuth: {
    exchangeLinkedInCode: vi.fn(),
    resolveLinkedInAccount: vi.fn(),
  },
  LINKEDIN_SCOPES: ['openid', 'profile', 'w_organization_social'],
}));

vi.mock('@/lib/oauth/providers/x', () => ({
  xOAuth: {
    exchangeXCode: vi.fn(),
    resolveXAccount: vi.fn(),
  },
  X_SCOPES: ['tweet.read', 'tweet.write', 'users.read'],
}));

vi.mock('@/lib/oauth/providers/meta', () => ({
  metaOAuth: {
    exchangeMetaCode: vi.fn(),
    exchangeMetaLongLivedToken: vi.fn(),
    resolveMetaPageAccounts: vi.fn(),
  },
  META_SCOPES: ['pages_manage_posts'],
}));

vi.mock('@/lib/oauth/state', () => ({
  verifyOAuthState: vi.fn(),
}));

import { upsertSocialConnection } from '@/lib/oauth/connection-store';
import { linkedInOAuth } from '@/lib/oauth/providers/linkedin';
import { xOAuth } from '@/lib/oauth/providers/x';
import { metaOAuth } from '@/lib/oauth/providers/meta';
import { verifyOAuthState } from '@/lib/oauth/state';
import { GET as linkedInCallback } from '@/app/api/oauth/linkedin/callback/route';
import { GET as xCallback } from '@/app/api/oauth/x/callback/route';
import { GET as metaCallback } from '@/app/api/oauth/meta/callback/route';

function mockState(
  overrides: Partial<{
    workspaceId: string;
    userId: string;
    platform: 'linkedin' | 'x' | 'facebook';
    codeVerifier?: string;
  }>,
) {
  return {
    workspaceId: '123e4567-e89b-12d3-a456-426614174000',
    userId: 'user-1',
    platform: 'linkedin' as const,
    nonce: 'test-nonce',
    exp: Date.now() + 60_000,
    ...overrides,
  };
}

function callbackRequest(path: string, params: Record<string, string>) {
  const url = new URL(path, 'http://localhost:3005');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url);
}

function expectOAuthRedirect(res: Response, platform: string, outcome: 'success' | 'error') {
  expect(res.status).toBeGreaterThanOrEqual(300);
  expect(res.status).toBeLessThan(400);
  const location = res.headers.get('location');
  expect(location).toBeTruthy();
  const redirect = new URL(location!);
  expect(redirect.pathname).toBe('/settings');
  expect(redirect.searchParams.get('oauth')).toBe(outcome);
  expect(redirect.searchParams.get('platform')).toBe(platform);
}

describe('Integration: OAuth callback routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3005';
  });

  describe('LinkedIn /api/oauth/linkedin/callback', () => {
    it('redirects with error when provider returns error param', async () => {
      const res = await linkedInCallback(
        callbackRequest('/api/oauth/linkedin/callback', {
          error: 'access_denied',
          error_description: 'User cancelled',
        }),
      );
      expectOAuthRedirect(res, 'linkedin', 'error');
    });

    it('redirects with error when code or state is missing', async () => {
      const res = await linkedInCallback(callbackRequest('/api/oauth/linkedin/callback', {}));
      expectOAuthRedirect(res, 'linkedin', 'error');
      expect(new URL(res.headers.get('location')!).searchParams.get('message')).toContain('Missing');
    });

    it('redirects with success after token exchange and connection upsert', async () => {
      vi.mocked(verifyOAuthState).mockReturnValue(mockState({ platform: 'linkedin' }));
      vi.mocked(linkedInOAuth.exchangeLinkedInCode).mockResolvedValue({
        access_token: 'li-token',
        expires_in: 3600,
        refresh_token: 'li-refresh',
        scope: 'openid profile',
      });
      vi.mocked(linkedInOAuth.resolveLinkedInAccount).mockResolvedValue({
        accountId: 'org-1',
        accountName: 'Test Org',
        accountHandle: '@test',
        authorUrn: 'urn:li:organization:1',
      });

      const res = await linkedInCallback(
        callbackRequest('/api/oauth/linkedin/callback', {
          code: 'auth-code',
          state: 'signed-state',
        }),
      );

      expectOAuthRedirect(res, 'linkedin', 'success');
      expect(upsertSocialConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: '123e4567-e89b-12d3-a456-426614174000',
          platform: 'linkedin',
          accessToken: 'li-token',
        }),
      );
    });

    it('redirects with error on invalid OAuth state', async () => {
      vi.mocked(verifyOAuthState).mockImplementation(() => {
        throw new Error('Invalid OAuth state signature');
      });

      const res = await linkedInCallback(
        callbackRequest('/api/oauth/linkedin/callback', {
          code: 'auth-code',
          state: 'bad-state',
        }),
      );

      expectOAuthRedirect(res, 'linkedin', 'error');
    });
  });

  describe('X /api/oauth/x/callback', () => {
    it('redirects with error when PKCE verifier missing from state', async () => {
      vi.mocked(verifyOAuthState).mockReturnValue(mockState({ platform: 'x' }));

      const res = await xCallback(
        callbackRequest('/api/oauth/x/callback', {
          code: 'auth-code',
          state: 'signed-state',
        }),
      );

      expectOAuthRedirect(res, 'x', 'error');
      expect(new URL(res.headers.get('location')!).searchParams.get('message')).toContain('PKCE');
    });

    it('redirects with success when PKCE flow completes', async () => {
      vi.mocked(verifyOAuthState).mockReturnValue(
        mockState({
          platform: 'x',
          codeVerifier: 'pkce-verifier-12345678901234567890123456789012',
        }),
      );
      vi.mocked(xOAuth.exchangeXCode).mockResolvedValue({
        access_token: 'x-token',
        expires_in: 7200,
        refresh_token: 'x-refresh',
        scope: 'tweet.write',
      });
      vi.mocked(xOAuth.resolveXAccount).mockResolvedValue({
        accountId: 'x-user-1',
        accountName: 'Test User',
        accountHandle: '@testuser',
      });

      const res = await xCallback(
        callbackRequest('/api/oauth/x/callback', {
          code: 'auth-code',
          state: 'signed-state',
        }),
      );

      expectOAuthRedirect(res, 'x', 'success');
      expect(upsertSocialConnection).toHaveBeenCalledWith(
        expect.objectContaining({ platform: 'x', accessToken: 'x-token' }),
      );
    });
  });

  describe('Meta /api/oauth/meta/callback', () => {
    it('redirects with error on provider denial', async () => {
      const res = await metaCallback(
        callbackRequest('/api/oauth/meta/callback', {
          error: 'access_denied',
        }),
      );
      expectOAuthRedirect(res, 'facebook', 'error');
    });

    it('redirects with success and upserts page connections', async () => {
      vi.mocked(verifyOAuthState).mockReturnValue(mockState({ platform: 'facebook' }));
      vi.mocked(metaOAuth.exchangeMetaCode).mockResolvedValue({
        access_token: 'short-token',
        expires_in: 3600,
      });
      vi.mocked(metaOAuth.exchangeMetaLongLivedToken).mockResolvedValue({
        access_token: 'long-token',
        expires_in: 5184000,
      });
      vi.mocked(metaOAuth.resolveMetaPageAccounts).mockResolvedValue([
        {
          platform: 'facebook',
          accountId: 'page-1',
          accountName: 'Test Page',
          accountHandle: 'testpage',
          pageAccessToken: 'page-token',
          metadata: { page_id: 'page-1' },
        },
      ]);

      const res = await metaCallback(
        callbackRequest('/api/oauth/meta/callback', {
          code: 'meta-code',
          state: 'signed-state',
        }),
      );

      expectOAuthRedirect(res, 'facebook', 'success');
      expect(upsertSocialConnection).toHaveBeenCalledTimes(1);
    });
  });
});
