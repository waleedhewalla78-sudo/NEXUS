import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';

function parseEncryptionKey(): Buffer {
  const hex = process.env.TOKEN_ENCRYPTION_KEY ?? '';
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be 32 bytes encoded as 64 hex characters');
  }
  return Buffer.from(hex, 'hex');
}

export type EncryptedTokenPayload = {
  ciphertext: string;
  iv: string;
  tag: string;
};

export function encryptToken(plaintext: string): EncryptedTokenPayload {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, parseEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
  };
}

export function decryptToken(payload: EncryptedTokenPayload): string {
  const decipher = createDecipheriv(
    ALGORITHM,
    parseEncryptionKey(),
    Buffer.from(payload.iv, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, 'base64')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

export const tokenVault = {
  encryptToken,
  decryptToken,
};
