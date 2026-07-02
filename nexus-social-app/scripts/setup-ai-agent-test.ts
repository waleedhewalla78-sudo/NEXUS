/**
 * Seed AI agent config for walkthrough workspace from env vars.
 * Usage: npm run ai:setup
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = join(scriptDir, '..');

function clearStalePlaceholderEnv() {
  for (const key of [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'DIFY_API_KEY',
  ]) {
    const value = process.env[key];
    if (value && /placeholder|preflight/i.test(value)) {
      delete process.env[key];
    }
  }
}

function loadEnvFile(relativePath: string, override: boolean) {
  const full = join(rootDir, relativePath);
  if (!existsSync(full)) return;
  for (const line of readFileSync(full, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (override || process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

clearStalePlaceholderEnv();
loadEnvFile('.env', false);
loadEnvFile('.env.local', true);

const WALKTHROUGH_WORKSPACE_ID =
  process.env.NEXT_PUBLIC_DEFAULT_WORKSPACE_ID ?? '11111111-1111-1111-1111-111111111111';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url || !key) {
    console.error('[ai:setup] Missing Supabase env vars');
    process.exitCode = 1;
    return;
  }

  const difyKey = process.env.DIFY_API_KEY ?? '';
  const difyAppId = process.env.DIFY_APP_ID ?? 'local-dev-app';
  const difyDatasetId = process.env.DIFY_DATASET_ID ?? 'local-dev-dataset';

  if (!difyKey) {
    console.warn('[ai:setup] DIFY_API_KEY not set — config row created with empty app key.');
    console.warn('[ai:setup] Add your Dify app API key to .env.local or /settings/ai-agent');
  }

  const supabase = createClient(url, key);

  const { error } = await supabase.from('ai_agent_configs').upsert(
    {
      workspace_id: WALKTHROUGH_WORKSPACE_ID,
      dify_app_id: difyAppId,
      dify_dataset_id: difyDatasetId,
      dify_app_api_key: difyKey,
      persona_name: 'Nexus Support Agent',
      is_active: true,
      is_globally_disabled: false,
      traffic_allocation_percentage: 100,
      daily_token_limit: 100000,
    },
    { onConflict: 'workspace_id' },
  );

  if (error) {
    console.error('[ai:setup] Failed:', error.message);
    if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
      console.error('[ai:setup] PostgREST schema cache is stale for writes.');
      console.error('[ai:setup] In Supabase SQL Editor, run: src/sql/reload_postgrest_schema.sql');
      console.error('[ai:setup] Or re-run schema_patch.sql (ends with NOTIFY pgrst).');
      console.error('[ai:setup] Dashboard: https://supabase.com/dashboard/project/lnlzxaqockpjezxskmnb/sql/new');
    } else if (error.code === '42P01') {
      console.error('[ai:setup] Run schema_patch.sql in Supabase first.');
    }
    process.exitCode = 1;
    return;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3005';
  console.log('[ai:setup] AI agent config ready for workspace:', WALKTHROUGH_WORKSPACE_ID);
  console.log('[ai:setup] Dify base URL:', process.env.DIFY_BASE_URL ?? '(not set)');
  console.log('[ai:setup] Next steps:');
  console.log('  1. npm run ai:verify');
  console.log('  2. Open', `${appUrl}/settings/ai-agent`);
  console.log('  3. Click "Test Dify connection"');
  console.log('  4. npm run worker:dev (with Redis) for inbox auto-replies');
}

main().catch((err) => {
  console.error('[ai:setup] Failed:', err);
  process.exitCode = 1;
});
