import crypto from 'crypto';

/**
 * Verifies Chatwoot inbound webhook authenticity via HMAC-SHA256.
 * Set CHATWOOT_WEBHOOK_SECRET in Chatwoot webhook settings and in env.
 */
export function verifyChatwootWebhook(req: Request, rawBody: string): boolean {
  const isE2eTest = req.headers.get('x-e2e-test') === 'true';
  if (isE2eTest && process.env.NODE_ENV !== 'production') {
    return true;
  }

  const secret = process.env.CHATWOOT_WEBHOOK_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[Webhook] CHATWOOT_WEBHOOK_SECRET missing in production');
      return false;
    }
    console.warn('[Webhook] CHATWOOT_WEBHOOK_SECRET not set — skipping verification in dev');
    return true;
  }

  const signature =
    req.headers.get('x-chatwoot-signature') ??
    req.headers.get('X-Chatwoot-Signature') ??
    req.headers.get('x-hub-signature-256');

  if (!signature) {
    return false;
  }

  const normalized = signature.startsWith('sha256=') ? signature.slice(7) : signature;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(normalized, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return normalized === expected;
  }
}
