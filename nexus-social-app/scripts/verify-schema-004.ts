/**
 * Verify Feature 004 (AI CMO Sprint 12) Supabase tables.
 * Usage: npm run schema:verify:004
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

const AI_CMO_TABLES = [
  'tenants',
  'brands',
  'ai_cmo_campaigns',
  'ai_cmo_strategies',
  'ai_cmo_content_pieces',
  'ai_cmo_learnings',
  'ai_cmo_campaign_outcomes',
  'ai_cmo_strategy_history',
  'ai_cmo_cost_ledger',
  'ai_cmo_attribution_events',
  'ai_cmo_evaluations',
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url || !key) {
    console.error('[verify-schema-004] Missing Supabase env vars');
    process.exitCode = 1;
    return;
  }

  const supabase = createClient(url, key);
  const missing: string[] = [];
  const ok: string[] = [];

  for (const table of AI_CMO_TABLES) {
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
      console.warn(`[verify-schema-004] ${table}: ${error.code ?? 'error'} â€” ${error.message}`);
      missing.push(table);
    } else {
      ok.push(table);
    }
  }

  console.log('[verify-schema-004] Present:', ok.length, '/', AI_CMO_TABLES.length);
  ok.forEach((t) => console.log('  âœ“', t));

  if (missing.length) {
    console.log('[verify-schema-004] Missing tables:');
    missing.forEach((t) => console.log('  âœ—', t));
    console.log('\nApply Feature 004 migrations:');
    console.log('  supabase/migrations/RUN_IN_SQL_EDITOR_004_sprint12.sql (000011 + 000012)');
    console.log('  supabase/migrations/RUN_IN_SQL_EDITOR_004_000012_only.sql (000012 only, if 000011 applied)');
    process.exitCode = 1;
    return;
  }

  console.log('[verify-schema-004] All AI CMO Sprint 12 tables present.');
}

main().catch((err) => {
  console.error('[verify-schema-004] Failed:', err);
  process.exitCode = 1;
});
