/**
 * Utility to verify required environment variables at boot time.
 * This prevents silent failures in production for critical integrations.
 */

const BASE_REQUIRED = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'INTERNAL_TOOL_SECRET',
  'REDIS_URL',
];

const DEV_OPTIONAL = ['DIFY_API_KEY'];

const PRODUCTION_REQUIRED = [
  ...BASE_REQUIRED,
  'DIFY_API_KEY',
  'CHATWOOT_WEBHOOK_SECRET',
  'APPROVAL_HMAC_SECRET',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'NEXT_PUBLIC_APP_URL',
];

const PUBLISHING_REQUIRED = ['TOKEN_ENCRYPTION_KEY'];

function isPublishingEnabled(): boolean {
  return (process.env.PUBLISHING_ENABLED ?? 'true').toLowerCase() !== 'false';
}

export function verifyEnv() {
  // Skip during `next build` static collection — env is validated at runtime in instrumentation.ts
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return;
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const requiredEnvVars = [
    ...(isProduction ? PRODUCTION_REQUIRED : BASE_REQUIRED),
    ...(isProduction && isPublishingEnabled() ? PUBLISHING_REQUIRED : []),
  ];

  const missing = requiredEnvVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    const message = `Missing required environment variables: ${missing.join(', ')}`;
    console.error(`🚨 FATAL ERROR: ${message}`);
    if (isProduction) {
      throw new Error(message);
    }
  }

  if (!isProduction) {
    const optionalMissing = DEV_OPTIONAL.filter((key) => !process.env[key]);
    if (optionalMissing.length > 0) {
      console.warn(
        `[env] Optional for local dev (configure before AI features): ${optionalMissing.join(', ')}`,
      );
    }
  }
}
