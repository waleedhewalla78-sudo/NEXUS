/**
 * Verify Feature 004 Sprint 14 Supabase tables + RPC (migration 000013).
 * Usage: npm run schema:verify:004-sprint14
 *
 * Graceful: tables/RPC missing when 000013 not applied — reports count vs expected.
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

const SPRINT14_TABLES = [
  'ai_cmo_decision_ledger',
  'ai_cmo_agent_decisions',
  'ai_cmo_experiments',
  'ai_cmo_budget_policies',
  'ai_cmo_approval_requests',
] as const;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url || !key) {
    console.error('[verify-schema-004-sprint14] Missing Supabase env vars');
    process.exitCode = 1;
    return;
  }

  const supabase = createClient(url, key);
  const missing: string[] = [];
  const ok: string[] = [];

  for (const table of SPRINT14_TABLES) {
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
      console.warn(`[verify-schema-004-sprint14] ${table}: ${error.code ?? 'error'} — ${error.message}`);
      missing.push(table);
    } else {
      ok.push(table);
    }
  }

  let rpcOk = false;
  const { error: rpcError } = await supabase.rpc('refresh_ai_cmo_materialized_views');
  if (!rpcError) {
    rpcOk = true;
    console.log('[verify-schema-004-sprint14] RPC refresh_ai_cmo_materialized_views: present');
  } else {
    const msg = rpcError.message?.toLowerCase() ?? '';
    if (msg.includes('could not find') || msg.includes('does not exist') || rpcError.code === 'PGRST202') {
      console.log('[verify-schema-004-sprint14] RPC refresh_ai_cmo_materialized_views: missing (apply 000013)');
    } else {
      console.warn('[verify-schema-004-sprint14] RPC check:', rpcError.message);
      rpcOk = true;
    }
  }

  console.log('[verify-schema-004-sprint14] Tables present:', ok.length, '/', SPRINT14_TABLES.length);
  ok.forEach((t) => console.log('  ✓', t));

  if (missing.length) {
    console.log('[verify-schema-004-sprint14] Missing tables:');
    missing.forEach((t) => console.log('  ✗', t));
    console.log('\nApply Sprint 14 migration:');
    console.log('  supabase/migrations/RUN_IN_SQL_EDITOR_004_000013_only.sql');
    process.exitCode = 1;
    return;
  }

  if (!rpcOk) {
    process.exitCode = 1;
    return;
  }

  console.log('[verify-schema-004-sprint14] Sprint 14 schema bundle verified.');
}

main().catch((err) => {
  console.error('[verify-schema-004-sprint14] Failed:', err);
  process.exitCode = 1;
});
