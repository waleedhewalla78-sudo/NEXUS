/**
 * Print DATABASE_URL host shape (no password) and try pooler rewrite apply for 20260721 only.
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
    const raw = readFileSync(p, 'utf8');
    if (file.endsWith('.json')) {
      try {
        const j = JSON.parse(raw) as Record<string, string>;
        for (const [k, v] of Object.entries(j)) {
          if (typeof v === 'string' && !process.env[k]) process.env[k] = v;
        }
      } catch {
        /* ignore */
      }
      continue;
    }
    for (const line of raw.split('\n')) {
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

function candidates(url: string): string[] {
  const out = [url];
  // db.<ref>.supabase.co → aws-0-<region>.pooler.supabase.com often works when direct DNS fails
  const m = url.match(/@db\.([a-z0-9]+)\.supabase\.co:(\d+)/i);
  if (m) {
    const ref = m[1];
    const port = m[2];
    // Session mode pooler (5432) and transaction (6543)
    out.push(url.replace(`@db.${ref}.supabase.co:${port}`, `@aws-0-eu-central-1.pooler.supabase.com:6543`).replace(/\/postgres(\?|$)/, `/postgres${RegExp.$1 || ''}`));
    // Also try rewriting user to postgres.<ref> for pooler
    out.push(
      url
        .replace(/\/\/([^:]+):([^@]+)@db\.[a-z0-9]+\.supabase\.co:\d+/i, `//postgres.${ref}:$2@aws-0-eu-central-1.pooler.supabase.com:6543`),
    );
  }
  return [...new Set(out)];
}

async function tryConnect(url: string): Promise<boolean> {
  const host = (url.match(/@([^:/]+)/) || [])[1] ?? '?';
  const client = new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  });
  try {
    await client.connect();
    await client.query('select 1');
    console.log(`[ok] connected via ${host}`);
    const sql = readFileSync(
      join(root, 'supabase/migrations/20260721_cost_to_serve_snapshots.sql'),
      'utf8',
    );
    await client.query(sql);
    console.log('[ok] applied 20260721_cost_to_serve_snapshots.sql');
    await client.end();
    return true;
  } catch (err) {
    console.warn(`[fail] ${host}:`, err instanceof Error ? err.message : err);
    try {
      await client.end();
    } catch {
      /* ignore */
    }
    return false;
  }
}

async function main() {
  loadEnvFiles();
  const databaseUrl = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;
  if (!databaseUrl) {
    console.error('No DATABASE_URL');
    process.exit(1);
  }
  const host = (databaseUrl.match(/@([^:/]+)/) || [])[1];
  console.log('primary_host:', host);
  for (const c of candidates(databaseUrl)) {
    if (await tryConnect(c)) {
      process.exit(0);
    }
  }
  console.error('Could not apply via any host candidate. Use Supabase SQL Editor for 20260721.');
  process.exit(2);
}

main();
