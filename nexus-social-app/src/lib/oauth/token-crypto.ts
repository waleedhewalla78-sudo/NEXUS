import { decryptToken, encryptToken } from '@/lib/crypto/token-vault';
import type { EncryptedConnectionUpdate, StoredConnectionTokens } from './types';

type ConnectionCryptoRow = {
  access_token_enc: string;
  refresh_token_enc: string | null;
  token_iv: string;
  token_tag: string;
  metadata: Record<string, unknown> | null;
};

function readRefreshCrypto(metadata: Record<string, unknown> | null): {
  iv: string;
  tag: string;
} | null {
  const iv = metadata?.refresh_token_iv;
  const tag = metadata?.refresh_token_tag;
  if (typeof iv === 'string' && typeof tag === 'string') {
    return { iv, tag };
  }
  return null;
}

function decryptRefreshToken(row: ConnectionCryptoRow): string | null {
  if (!row.refresh_token_enc) return null;
  const refreshCrypto = readRefreshCrypto(row.metadata);
  if (!refreshCrypto) return null;
  return decryptToken({
    ciphertext: row.refresh_token_enc,
    iv: refreshCrypto.iv,
    tag: refreshCrypto.tag,
  });
}

function decryptConnectionTokens(row: ConnectionCryptoRow): StoredConnectionTokens {
  const accessToken = decryptToken({
    ciphertext: row.access_token_enc,
    iv: row.token_iv,
    tag: row.token_tag,
  });
  return {
    accessToken,
    refreshToken: decryptRefreshToken(row),
  };
}

function buildEncryptedConnectionUpdate({
  tokens,
  expiresAt,
  existingMetadata,
}: {
  tokens: TokenRefreshResultLike;
  expiresAt: Date | null;
  existingMetadata: Record<string, unknown> | null;
}): EncryptedConnectionUpdate {
  const accessEncrypted = encryptToken(tokens.accessToken);
  const metadata: Record<string, unknown> = {
    ...(existingMetadata ?? {}),
    last_token_refresh_at: new Date().toISOString(),
  };

  let refreshTokenEnc: string | null = null;
  if (tokens.refreshToken) {
    const refreshEncrypted = encryptToken(tokens.refreshToken);
    refreshTokenEnc = refreshEncrypted.ciphertext;
    metadata.refresh_token_iv = refreshEncrypted.iv;
    metadata.refresh_token_tag = refreshEncrypted.tag;
  } else {
    delete metadata.refresh_token_iv;
    delete metadata.refresh_token_tag;
  }

  return {
    access_token_enc: accessEncrypted.ciphertext,
    token_iv: accessEncrypted.iv,
    token_tag: accessEncrypted.tag,
    refresh_token_enc: refreshTokenEnc,
    token_expires_at: expiresAt ? expiresAt.toISOString() : null,
    metadata,
    updated_at: new Date().toISOString(),
  };
}

type TokenRefreshResultLike = {
  accessToken: string;
  refreshToken?: string;
};

export const oauthTokenCrypto = {
  decryptConnectionTokens,
  buildEncryptedConnectionUpdate,
};
