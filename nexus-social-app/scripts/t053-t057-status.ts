/**
 * T053 / T057 gate status + dev sandbox actions.
 * Usage: npx ts-node scripts/t053-t057-status.ts [--approve-meta-dev]
 */
import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
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

const WALKTHROUGH_WORKSPACE_ID = '11111111-1111-1111-1111-111111111111';

function envStatus(name: string): 'SET' | 'MISSING' {
  const v = process.env[name]?.trim() ?? '';
  if (!v || /placeholder|your_|changeme|^xxx$/i.test(v)) return 'MISSING';
  return 'SET';
}

async function main() {
  const approveDev = process.argv.includes('--approve-meta-dev');

  console.log('=== T053 OAuth credential check ===');
  for (const key of [
    'LINKEDIN_CLIENT_ID',
    'LINKEDIN_CLIENT_SECRET',
    'X_CLIENT_ID',
    'X_CLIENT_SECRET',
    'META_APP_ID',
    'META_APP_SECRET',
    'FACEBOOK_PAGE_ID',
    'FACEBOOK_PAGE_ACCESS_TOKEN',
  ]) {
    console.log(`  ${key}: ${envStatus(key)}`);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url || !serviceKey) {
    console.error('\nMissing Supabase URL or service role key.');
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey);

  console.log('\n=== Workspace / Meta gate (T057) ===');
  const { data: workspaces, error: wsError } = await supabase
    .from('workspaces')
    .select('id, name, meta_app_review_status')
    .limit(10);

  if (wsError) {
    console.error('  workspaces query failed:', wsError.message);
  } else {
    for (const ws of workspaces ?? []) {
      console.log(`  ${ws.id} | ${ws.name} | meta_app_review_status=${ws.meta_app_review_status ?? 'null'}`);
    }
  }

  if (approveDev) {
    console.log('\n=== T057 dev sandbox: set meta_app_review_status=approved (NOT Meta App Review) ===');
    const { error: updateError } = await supabase
      .from('workspaces')
      .update({ meta_app_review_status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', WALKTHROUGH_WORKSPACE_ID);

    if (updateError) {
      console.error('  UPDATE failed:', updateError.message);
      process.exit(1);
    }
    console.log(`  Updated walkthrough workspace ${WALKTHROUGH_WORKSPACE_ID}`);
    console.log('  NOTE: This enables the DB gate only. Meta App Review in developers.facebook.com is still required for production IG/FB.');
  }

  console.log('\n=== T053 publish readiness (walkthrough workspace) ===');
  const { data: connections } = await supabase
    .from('workspace_social_connections')
    .select('platform, account_name, connected_at')
    .eq('workspace_id', WALKTHROUGH_WORKSPACE_ID)
    .is('disconnected_at', null);

  console.log(`  Active OAuth connections: ${connections?.length ?? 0}`);
  for (const c of connections ?? []) {
    console.log(`    - ${c.platform}: ${c.account_name ?? 'unnamed'}`);
  }

  const { data: posts } = await supabase
    .from('posts')
    .select('id, status, platforms, scheduled_at, external_post_id, publish_error')
    .eq('workspace_id', WALKTHROUGH_WORKSPACE_ID)
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('  Recent posts:');
  for (const p of posts ?? []) {
    console.log(`    - ${p.id.slice(0, 8)}… status=${p.status} platforms=${JSON.stringify(p.platforms)} ext=${p.external_post_id ?? 'none'}`);
  }

  const oauthReady =
    envStatus('LINKEDIN_CLIENT_ID') === 'SET' ||
    envStatus('X_CLIENT_ID') === 'SET' ||
    (envStatus('FACEBOOK_PAGE_ACCESS_TOKEN') === 'SET' && envStatus('FACEBOOK_PAGE_ID') === 'SET');

  console.log('\n=== Verdict ===');
  if (!oauthReady) {
    console.log('T053 BLOCKED: Add LINKEDIN_* or X_* sandbox credentials to .env.local (see .env.example).');
    console.log('  Or set FACEBOOK_PAGE_ID + FACEBOOK_PAGE_ACCESS_TOKEN for env-fallback publish test.');
  } else {
    console.log('T053 READY: OAuth env present — run manual UAT per LAUNCH_CHECKLIST.md § Phase 4.');
  }

  if (!approveDev) {
    console.log('T057 SQL: Run with --approve-meta-dev to set walkthrough workspace gate, or use scripts/enable-meta-publish.sql after real Meta approval.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
