import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encryptToken } from '../src/lib/crypto/token-vault';

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
  const workspaceId = process.argv[2] ?? process.env.NEXT_PUBLIC_DEFAULT_WORKSPACE_ID;
  const platform = (process.argv[3] ?? 'facebook').toLowerCase();
  const accountId = process.argv[4] ?? process.env.FACEBOOK_PAGE_ID ?? '';
  const accessToken = process.argv[5] ?? process.env.FACEBOOK_PAGE_ACCESS_TOKEN ?? '';

  if (!workspaceId || !accountId || !accessToken) {
    console.error('Usage: npm run seed:social-connection -- <workspace-id> [platform] [account-id] [access-token]');
    console.error('Or set NEXT_PUBLIC_DEFAULT_WORKSPACE_ID, FACEBOOK_PAGE_ID, FACEBOOK_PAGE_ACCESS_TOKEN');
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!supabaseUrl || !serviceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const encrypted = encryptToken(accessToken);
  const supabase = createClient(supabaseUrl, serviceKey);

  await supabase
    .from('workspace_social_connections')
    .update({ disconnected_at: new Date().toISOString() })
    .eq('workspace_id', workspaceId)
    .eq('platform', platform)
    .is('disconnected_at', null);

  const { data, error } = await supabase
    .from('workspace_social_connections')
    .insert({
      workspace_id: workspaceId,
      platform,
      account_id: accountId,
      account_name: process.env.FACEBOOK_PAGE_NAME ?? 'Facebook Page',
      access_token_enc: encrypted.ciphertext,
      token_iv: encrypted.iv,
      token_tag: encrypted.tag,
      scopes: ['pages_manage_posts'],
      metadata: { seeded_by: 'scripts/seed-social-connection.ts' },
    })
    .select('id, platform, account_id')
    .single();

  if (error) {
    console.error('[seed] Failed:', error.message);
    process.exit(1);
  }

  console.log('[seed] Stored encrypted connection:', data);
}

main().catch((err: unknown) => {
  console.error('[seed]', err instanceof Error ? err.message : err);
  process.exit(1);
});
