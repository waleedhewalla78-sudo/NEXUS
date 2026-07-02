/**
 * Verify required Supabase tables exist for Track B features.
 * Usage: npx ts-node scripts/verify-schema.ts
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));

function loadEnvFile(relativePath: string, override: boolean) {
  const full = join(scriptDir, '..', relativePath);
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

loadEnvFile('.env', false);
loadEnvFile('.env.local', true);

const REQUIRED_TABLES = [
  'workspaces',
  'users',
  'workspace_members',
  'posts',
  'ai_agent_configs',
  'automation_flows',
  'external_reviews',
  'chatwoot_inbox_workspace_map',
  'user_notifications',
  'workspace_invites',
  'custom_reports',
  'workspace_sso_configs',
  'ai_credit_ledger',
  'workspace_social_connections',
  'post_analytics',
  'listening_queries',
  'mentions',
  'migration_status',
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url || !key) {
    console.error('[verify-schema] Missing Supabase env vars');
    process.exitCode = 1;
    return;
  }

  const supabase = createClient(url, key);
  const missing: string[] = [];
  let ok: string[] = [];

  for (const table of REQUIRED_TABLES) {
    const { error } = await supabase.from(table).select('*').limit(1);
    const msg = error?.message?.toLowerCase() ?? '';
    const missingTable =
      error &&
      (error.code === '42P01' ||
        error.code === 'PGRST205' ||
        msg.includes('does not exist') ||
        msg.includes('schema cache'));
    if (missingTable) {
      missing.push(table);
    } else if (error) {
      if (msg.includes('fetch failed') || error.name === 'AuthRetryableFetchError') {
        console.warn(`[verify-schema] ${table}: unreachable (${error.message})`);
        missing.push(table);
      } else {
        console.warn(`[verify-schema] ${table}: ${error.code ?? 'error'} — ${error.message}`);
        missing.push(table);
      }
    } else {
      ok.push(table);
    }
  }

  // PostgREST can serve reads while writes still fail on stale cache — probe upsert.
  const probeWorkspaceId =
    process.env.NEXT_PUBLIC_DEFAULT_WORKSPACE_ID ?? '11111111-1111-1111-1111-111111111111';
  const { error: writeError } = await supabase.from('ai_agent_configs').upsert(
    {
      workspace_id: probeWorkspaceId,
      dify_app_id: 'schema-probe',
      dify_dataset_id: 'schema-probe',
      persona_name: 'Schema probe',
      is_active: false,
    },
    { onConflict: 'workspace_id' },
  );
  if (writeError) {
    const writeMsg = writeError.message?.toLowerCase() ?? '';
    console.warn(
      `[verify-schema] Write probe failed (${writeError.code ?? 'error'}): ${writeError.message}`,
    );
    if (
      writeError.code === 'PGRST205' ||
      writeMsg.includes('schema cache') ||
      writeMsg.includes('does not exist')
    ) {
      if (!missing.includes('ai_agent_configs')) missing.push('ai_agent_configs (write cache stale)');
      ok = ok.filter((t) => t !== 'ai_agent_configs');
    }
  }

  console.log('[verify-schema] Present:', ok.length, '/', REQUIRED_TABLES.length);
  ok.forEach((t) => console.log('  ✓', t));

  if (missing.length) {
    console.log('[verify-schema] Missing tables:');
    missing.forEach((t) => console.log('  ✗', t));
    console.log('\nApply migrations with Supabase CLI:');
    console.log('  npm run db:link      # one-time remote link');
    console.log('  npm run db:migrate   # linked remote project');
    console.log('  npm run db:reset     # local supabase reset');
    console.log('  npm run db:migrate:local -- -DatabaseUrl "postgresql://..."');
    console.log('  Or paste files from supabase/migrations/ in order into SQL Editor');
    process.exitCode = 1;
    return;
  }

  console.log('[verify-schema] All required tables present.');
}

main().catch((err) => {
  console.error('[verify-schema] Failed:', err);
  process.exitCode = 1;
});
