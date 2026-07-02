import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { verifyEnv } from '@/lib/verify-env';

describe('verifyEnv', () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of [
      'NODE_ENV',
      'NEXT_PHASE',
      'PUBLISHING_ENABLED',
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'INTERNAL_TOOL_SECRET',
      'REDIS_URL',
      'TOKEN_ENCRYPTION_KEY',
      'NEXT_PUBLIC_APP_URL',
    ]) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('requires publishing secrets in production when publishing is enabled', () => {
    vi.stubEnv('NODE_ENV', 'production');
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
    process.env.INTERNAL_TOOL_SECRET = 'internal-secret-min-32-characters-long';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.DIFY_API_KEY = 'app-key';
    process.env.CHATWOOT_WEBHOOK_SECRET = 'webhook';
    process.env.APPROVAL_HMAC_SECRET = 'approval-hmac-secret-min-32-chars';
    process.env.STRIPE_SECRET_KEY = 'sk_test';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    process.env.PUBLISHING_ENABLED = 'true';

    expect(() => verifyEnv()).toThrow(/TOKEN_ENCRYPTION_KEY/);
  });

  it('skips validation during next build phase', () => {
    vi.stubEnv('NEXT_PHASE', 'phase-production-build');
    vi.stubEnv('NODE_ENV', 'production');
    expect(() => verifyEnv()).not.toThrow();
  });
});
