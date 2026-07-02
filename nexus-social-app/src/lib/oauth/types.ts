import type { PublishPlatform } from '@/lib/publishers/types';

export type OAuthPlatform = PublishPlatform;

export type TokenRefreshResult = {
  accessToken: string;
  expiresAt: Date | null;
  refreshToken?: string;
};

export type TokenRefresher = {
  refresh({
    accessToken,
    refreshToken,
  }: {
    accessToken: string;
    refreshToken: string | null;
  }): Promise<TokenRefreshResult>;
};

export type StoredConnectionTokens = {
  accessToken: string;
  refreshToken: string | null;
};

export type EncryptedConnectionUpdate = {
  access_token_enc: string;
  token_iv: string;
  token_tag: string;
  refresh_token_enc: string | null;
  token_expires_at: string | null;
  metadata: Record<string, unknown>;
  updated_at: string;
};
