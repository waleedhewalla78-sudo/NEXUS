/**
 * Apply 20260705_enterprise_leads.sql using DATABASE_URL from env / .env.local / nexus-social-app.json
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

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

async function main() {
  loadEnvFiles();
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('Missing DATABASE_URL');
    process.exit(1);
  }

  const sqlPath = join(root, 'supabase/migrations/20260705_enterprise_leads.sql');
  const sql = readFileSync(sqlPath, 'utf8');

  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('localhost') ? undefined : { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    await client.query(sql);
    console.log('✓ Applied 20260705_enterprise_leads.sql');
    const { rows } = await client.query(
      `SELECT COUNT(*)::int AS n FROM information_schema.tables WHERE table_schema='public' AND table_name='enterprise_leads'`,
    );
    console.log(`enterprise_leads present: ${rows[0]?.n === 1}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
