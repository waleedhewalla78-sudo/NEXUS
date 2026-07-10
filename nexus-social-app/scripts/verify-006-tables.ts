/**
 * Verify Feature 006 tables via Supabase REST (no direct Postgres DNS).
 * Usage: npx tsx scripts/verify-006-tables.ts
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnvFiles() {
  for (const file of ['.env', '.env.local', 'nexus-social-app.json']) {
    const p = join(root, file);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq <= 0) continue;
      const key = t.slice(0, eq).trim();
      const val = t.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const EXPECTED_TABLES = [
  'conversation_qualifications',
  'conversation_escalations',
  'lead_scores',
  'qualified_leads',
  'workspace_conversation_settings',
  'cost_to_serve_snapshots',
];

async function main() {
  loadEnvFiles();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  let missing = 0;
  for (const table of EXPECTED_TABLES) {
    const { error } = await supabase.from(table).select('*').limit(0);
    if (error) {
      const msg = error.message;
      const gone =
        /does not exist|schema cache|Could not find the table/i.test(msg) ||
        error.code === '42P01' ||
        error.code === 'PGRST205';
      console.log(`${table}: ${gone ? 'MISSING' : 'ERROR'} (${msg.slice(0, 100)})`);
      if (gone) missing += 1;
    } else {
      console.log(`${table}: EXISTS`);
    }
  }

  if (missing > 0) {
    console.error(`[verify-006] ${missing} table(s) missing — apply SQL in Supabase SQL Editor:`);
    console.error('  supabase/migrations/20260720_conversation_qualification_tables.sql');
    console.error('  supabase/migrations/20260721_cost_to_serve_snapshots.sql');
    process.exit(2);
  }
  console.log('[verify-006] All Feature 006 tables present.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
