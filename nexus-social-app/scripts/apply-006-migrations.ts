/**
 * Apply Feature 006 migrations (20260720 + 20260721) via DATABASE_URL.
 * Usage: npx tsx scripts/apply-006-migrations.ts
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
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

const MIGRATIONS = [
  'supabase/migrations/20260720_conversation_qualification_tables.sql',
  'supabase/migrations/20260721_cost_to_serve_snapshots.sql',
];

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
  const databaseUrl = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!databaseUrl) {
    console.error('[apply-006] Missing DATABASE_URL (or SUPABASE_DB_URL).');
    console.error('[apply-006] Add the Supabase Postgres connection string, or paste these in SQL Editor:');
    for (const m of MIGRATIONS) console.error(`  ${join(root, m)}`);
    process.exit(1);
  }

  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('localhost') ? undefined : { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    for (const rel of MIGRATIONS) {
      const sqlPath = join(root, rel);
      const sql = readFileSync(sqlPath, 'utf8');
      console.log(`[apply-006] Applying ${rel} ...`);
      await client.query(sql);
      console.log(`[apply-006] ✓ ${rel}`);
    }

    const { rows } = await client.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = ANY($1::text[])
       ORDER BY table_name`,
      [EXPECTED_TABLES],
    );
    const found = new Set(rows.map((r: { table_name: string }) => r.table_name));
    for (const t of EXPECTED_TABLES) {
      console.log(`  ${t}: ${found.has(t) ? 'EXISTS' : 'MISSING'}`);
    }
    if (found.size !== EXPECTED_TABLES.length) {
      process.exitCode = 3;
      return;
    }
  } finally {
    await client.end();
  }

  // Seed default conversation settings for walkthrough workspace if service role present
  if (supabaseUrl && serviceKey) {
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const walkthroughWs = '11111111-1111-1111-1111-111111111111';
    const { error } = await supabase.from('workspace_conversation_settings').upsert(
      {
        workspace_id: walkthroughWs,
        mode: 'shadow',
        locale_default: 'ar-EG',
        compliance_profile: 'mena_conversational_v1',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'workspace_id' },
    );
    if (error) {
      console.warn('[apply-006] settings seed warn:', error.message);
    } else {
      console.log('[apply-006] ✓ workspace_conversation_settings seeded (shadow)');
    }
  }

  console.log('[apply-006] Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
