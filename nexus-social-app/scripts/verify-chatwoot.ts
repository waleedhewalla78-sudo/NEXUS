/**
 * Verify Chatwoot API credentials from .env.local
 * Usage: npx ts-node scripts/verify-chatwoot.ts
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));

function loadEnvFile(relativePath: string) {
  const full = join(scriptDir, '..', relativePath);
  if (!existsSync(full)) return;
  for (const line of readFileSync(full, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile('.env');
loadEnvFile('.env.local');

async function main() {
  const base = (process.env.CHATWOOT_BASE_URL ?? '').replace(/\/$/, '');
  const token = process.env.CHATWOOT_API_TOKEN ?? '';
  const accountId = process.env.CHATWOOT_ACCOUNT_ID ?? '';

  if (!base || !token) {
    console.error('[chatwoot] Set CHATWOOT_BASE_URL and CHATWOOT_API_TOKEN in .env.local');
    process.exit(1);
  }

  console.log(`[chatwoot] Testing ${base} ...`);

  const profileRes = await fetch(`${base}/api/v1/profile`, {
    headers: { api_access_token: token },
  });

  if (!profileRes.ok) {
    console.error('[chatwoot] Profile failed:', profileRes.status, await profileRes.text());
    process.exit(1);
  }

  const profile = (await profileRes.json()) as {
    name?: string;
    email?: string;
    account_id?: number;
  };

  console.log('[chatwoot] Profile OK:', profile.email ?? profile.name ?? 'authenticated');

  const resolvedAccountId = accountId || String(profile.account_id ?? '');
  if (!resolvedAccountId) {
    console.warn('[chatwoot] Set CHATWOOT_ACCOUNT_ID in .env.local (could not infer from profile)');
    process.exit(1);
  }

  const convRes = await fetch(
    `${base}/api/v1/accounts/${resolvedAccountId}/conversations`,
    { headers: { api_access_token: token } },
  );

  if (!convRes.ok) {
    console.error('[chatwoot] Conversations failed:', convRes.status, await convRes.text());
    console.warn('[chatwoot] Check CHATWOOT_ACCOUNT_ID matches your Chatwoot account');
    process.exit(1);
  }

  const conv = (await convRes.json()) as { data?: { payload?: unknown[] } };
  const count = conv.data?.payload?.length ?? 0;
  console.log(`[chatwoot] Account ${resolvedAccountId}: ${count} conversation(s) visible`);
  console.log('[chatwoot] Credentials valid — restart dev server to load live inbox.');
}

main().catch((err) => {
  console.error('[chatwoot] Failed:', err);
  process.exit(1);
});
