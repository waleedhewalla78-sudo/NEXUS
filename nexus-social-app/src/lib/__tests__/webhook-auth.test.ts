import { describe, expect, it, vi, afterEach } from 'vitest';
import { verifyChatwootWebhook } from '@/lib/webhook-auth';

describe('verifyChatwootWebhook', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('allows x-e2e-test header in non-production without secret', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('CHATWOOT_WEBHOOK_SECRET', '');

    const req = new Request('http://localhost/api/webhooks/chatwoot-ai', {
      method: 'POST',
      headers: { 'x-e2e-test': 'true' },
      body: '{}',
    });

    expect(verifyChatwootWebhook(req, '{}')).toBe(true);
  });

  it('rejects missing signature when secret is configured', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('CHATWOOT_WEBHOOK_SECRET', 'test-secret');

    const req = new Request('http://localhost/api/webhooks/chatwoot-ai', {
      method: 'POST',
      body: '{}',
    });

    expect(verifyChatwootWebhook(req, '{}')).toBe(false);
  });

  it('does not bypass x-e2e-test in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('CHATWOOT_WEBHOOK_SECRET', 'test-secret');

    const req = new Request('http://localhost/api/webhooks/chatwoot-ai', {
      method: 'POST',
      headers: { 'x-e2e-test': 'true' },
      body: '{}',
    });

    expect(verifyChatwootWebhook(req, '{}')).toBe(false);
  });
});
