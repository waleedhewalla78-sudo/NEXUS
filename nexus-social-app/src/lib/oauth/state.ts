import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { OAuthStatePlatform } from './types';

export type OAuthStatePayload = {
  workspaceId: string;
  userId: string;
  platform: OAuthStatePlatform;
  nonce: string;
  codeVerifier?: string;
  exp: number;
};

function getStateSecret(): string {
  const secret = process.env.APPROVAL_HMAC_SECRET ?? process.env.TOKEN_ENCRYPTION_KEY ?? '';
  if (!secret) {
    throw new Error('APPROVAL_HMAC_SECRET or TOKEN_ENCRYPTION_KEY is required for OAuth state');
  }
  return secret;
}

export function createOAuthState({
  workspaceId,
  userId,
  platform,
  codeVerifier,
  ttlMs = 10 * 60 * 1000,
}: {
  workspaceId: string;
  userId: string;
  platform: OAuthStatePlatform;
  codeVerifier?: string;
  ttlMs?: number;
}): string {
  const payload: OAuthStatePayload = {
    workspaceId,
    userId,
    platform,
    nonce: randomBytes(16).toString('hex'),
    codeVerifier,
    exp: Date.now() + ttlMs,
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', getStateSecret()).update(data).digest('base64url');
  return `${data}.${signature}`;
}

export function verifyOAuthState(state: string): OAuthStatePayload {
  const dotIndex = state.indexOf('.');
  if (dotIndex <= 0) {
    throw new Error('Invalid OAuth state');
  }

  const data = state.slice(0, dotIndex);
  const signature = state.slice(dotIndex + 1);
  const expected = createHmac('sha256', getStateSecret()).update(data).digest('base64url');

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
    throw new Error('Invalid OAuth state signature');
  }

  const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as OAuthStatePayload;
  if (payload.exp < Date.now()) {
    throw new Error('OAuth state expired');
  }

  return payload;
}

export const oauthStateUtils = {
  createOAuthState,
  verifyOAuthState,
};
