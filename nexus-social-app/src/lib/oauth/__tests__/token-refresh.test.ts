import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { encryptToken } from '@/lib/crypto/token-vault';
import { oauthTokenCrypto } from '@/lib/oauth/token-crypto';
import { tokenRefreshUtils } from '@/lib/oauth/token-refresh';

const TEST_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

describe('token-refresh', () => {
  beforeEach(() => {
    process.env.TOKEN_ENCRYPTION_KEY = TEST_KEY;
    process.env.LINKEDIN_CLIENT_ID = 'linkedin-client';
    process.env.LINKEDIN_CLIENT_SECRET = 'linkedin-secret';
    process.env.X_CLIENT_ID = 'x-client';
    process.env.X_CLIENT_SECRET = 'x-secret';
    process.env.META_APP_ID = 'meta-app';
    process.env.META_APP_SECRET = 'meta-secret';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('expiresAtFromSeconds returns a future date', () => {
    const expiresAt = tokenRefreshUtils.expiresAtFromSeconds(3600);
    expect(expiresAt).not.toBeNull();
    expect(expiresAt!.getTime()).toBeGreaterThan(Date.now());
  });

  it('refreshLinkedInToken exchanges refresh token for access token', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'new-linkedin-access',
          expires_in: 5184000,
          refresh_token: 'rotated-linkedin-refresh',
        }),
      }),
    );

    const result = await tokenRefreshUtils.refreshLinkedInToken({
      accessToken: 'old-access',
      refreshToken: 'old-refresh',
    });

    expect(result.accessToken).toBe('new-linkedin-access');
    expect(result.refreshToken).toBe('rotated-linkedin-refresh');
    expect(result.expiresAt).not.toBeNull();
  });

  it('refreshXToken exchanges refresh token for access token', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'new-x-access',
          expires_in: 7200,
          refresh_token: 'rotated-x-refresh',
        }),
      }),
    );

    const result = await tokenRefreshUtils.refreshXToken({
      accessToken: 'old-access',
      refreshToken: 'old-refresh',
    });

    expect(result.accessToken).toBe('new-x-access');
    expect(result.refreshToken).toBe('rotated-x-refresh');
  });

  it('refreshMetaToken exchanges short-lived token for long-lived token', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'long-lived-meta',
          expires_in: 5184000,
        }),
      }),
    );

    const result = await tokenRefreshUtils.refreshMetaToken({
      accessToken: 'short-lived-meta',
      refreshToken: null,
    });

    expect(result.accessToken).toBe('long-lived-meta');
    expect(result.expiresAt).not.toBeNull();
  });

  it('surfaces OAuth errors from failed refresh responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error_description: 'Refresh token expired' }),
      }),
    );

    await expect(
      tokenRefreshUtils.refreshLinkedInToken({
        accessToken: 'old-access',
        refreshToken: 'expired-refresh',
      }),
    ).rejects.toThrow('Refresh token expired');
  });
});

describe('oauthTokenCrypto', () => {
  beforeEach(() => {
    process.env.TOKEN_ENCRYPTION_KEY = TEST_KEY;
  });

  it('round-trips access and refresh tokens with separate refresh crypto metadata', () => {
    const accessEncrypted = encryptToken('access-token');
    const refreshEncrypted = encryptToken('refresh-token');

    const decrypted = oauthTokenCrypto.decryptConnectionTokens({
      access_token_enc: accessEncrypted.ciphertext,
      refresh_token_enc: refreshEncrypted.ciphertext,
      token_iv: accessEncrypted.iv,
      token_tag: accessEncrypted.tag,
      metadata: {
        refresh_token_iv: refreshEncrypted.iv,
        refresh_token_tag: refreshEncrypted.tag,
      },
    });

    expect(decrypted.accessToken).toBe('access-token');
    expect(decrypted.refreshToken).toBe('refresh-token');
  });

  it('buildEncryptedConnectionUpdate stores rotated refresh token metadata', () => {
    const update = oauthTokenCrypto.buildEncryptedConnectionUpdate({
      tokens: {
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      },
      expiresAt: new Date('2026-12-31T00:00:00.000Z'),
      existingMetadata: { account_type: 'page' },
    });

    expect(update.access_token_enc).toBeTruthy();
    expect(update.refresh_token_enc).toBeTruthy();
    expect(update.metadata.refresh_token_iv).toBeTruthy();
    expect(update.metadata.refresh_token_tag).toBeTruthy();
    expect(update.metadata.account_type).toBe('page');
    expect(update.token_expires_at).toBe('2026-12-31T00:00:00.000Z');
  });
});
