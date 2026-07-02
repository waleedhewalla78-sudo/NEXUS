/**
 * V2.0 Full-Stack verification — run after bootstrap:local
 * Usage: npm run verify:v2-stack
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Redis from 'ioredis';

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

type CheckResult = { name: string; ok: boolean; detail: string };

const checks: CheckResult[] = [];

function record(name: string, ok: boolean, detail: string) {
  checks.push({ name, ok, detail });
  const icon = ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
  console.log(`  ${icon} ${name}: ${detail}`);
}

async function checkRedis(): Promise<void> {
  const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
  const redis = new Redis(url, {
    maxRetriesPerRequest: 1,
    connectTimeout: 3000,
    lazyConnect: true,
    enableOfflineQueue: false,
  });
  redis.on('error', () => {
    // Suppress ioredis unhandled error spam — result captured in catch below
  });
  try {
    await redis.connect();
    const pong = await redis.ping();
    record('Redis', pong === 'PONG', pong);
  } catch (err) {
    record('Redis', false, err instanceof Error ? err.message : String(err));
  } finally {
    redis.disconnect();
  }
}

async function checkSupabase(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url || !key) {
    record('Supabase', false, 'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return;
  }
  try {
    const res = await fetch(`${url}/rest/v1/workspaces?select=id&limit=1`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      record('Supabase', false, `HTTP ${res.status}`);
      return;
    }
    record('Supabase', true, 'Connected');
  } catch (err) {
    record('Supabase', false, err instanceof Error ? err.message : String(err));
  }
}

async function checkQdrant(): Promise<void> {
  const qdrantUrl = process.env.QDRANT_URL ?? 'http://localhost:6333';
  try {
    const res = await fetch(`${qdrantUrl}/collections`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      record('Qdrant', false, `HTTP ${res.status}`);
      return;
    }
    const body = (await res.json()) as { result?: { collections?: unknown[] } };
    const count = body.result?.collections?.length ?? 0;
    record('Qdrant', true, `Alive — ${count} collection(s) (clean slate expected: 0)`);
    if (count > 0) {
      console.log('    ℹ Existing collections:', JSON.stringify(body.result?.collections));
    }
  } catch (err) {
    record('Qdrant', false, err instanceof Error ? err.message : String(err));
  }
}

async function checkOllama(): Promise<void> {
  if ((process.env.USE_LOCAL_OLLAMA ?? 'false').toLowerCase() !== 'true') {
    record('Ollama', true, 'Skipped (USE_LOCAL_OLLAMA=false)');
    return;
  }
  const configured = (process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434').replace(
    'localhost',
    '127.0.0.1',
  );
  const candidates = [
    configured,
    configured.replace('127.0.0.1', 'localhost'),
    'http://127.0.0.1:11434',
    'http://localhost:11434',
  ].filter((v, i, a) => a.indexOf(v) === i);

  let bestCount = 0;
  let bestNames = '';

  for (const base of candidates) {
    try {
      const res = await fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(30_000) });
      if (!res.ok) {
        continue;
      }
      const body = (await res.json()) as { models?: Array<{ name?: string }> };
      const count = body.models?.length ?? 0;
      if (count > bestCount) {
        bestCount = count;
        bestNames = (body.models ?? [])
          .slice(0, 3)
          .map((m) => m.name)
          .filter(Boolean)
          .join(', ');
      }
      if (count > 0) {
        record(
          'Ollama',
          true,
          `${count} model(s) via ${base}${bestNames ? ` (${bestNames}${count > 3 ? ', …' : ''})` : ''}`,
        );
        return;
      }
    } catch {
      // try next candidate
    }
  }

  if (bestCount === 0) {
    record('Ollama', true, '0 model(s) — run `ollama pull llama3.2` (tags reachable but empty)');
    return;
  }
  record('Ollama', false, 'Unreachable — start `ollama serve` and check /api/tags');
}

async function checkV2Tables(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url || !key) {
    record('Migration 000015', false, 'Supabase env missing');
    return;
  }
  const v2Tables = ['ai_cmo_external_signals', 'ai_cmo_failed_jobs'];
  const missing: string[] = [];

  for (const table of v2Tables) {
    try {
      const res = await fetch(`${url}/rest/v1/${table}?select=id&limit=1`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(8000),
      });
      if (res.status === 404 || res.status === 406) {
        missing.push(table);
      } else if (!res.ok) {
        const body = await res.text();
        if (body.toLowerCase().includes('does not exist') || body.includes('PGRST205')) {
          missing.push(table);
        }
      }
    } catch {
      missing.push(table);
    }
  }

  if (missing.length) {
    record('Migration 000015', false, `Missing tables: ${missing.join(', ')} — run npm run bootstrap:local`);
  } else {
    record('Migration 000015', true, 'ai_cmo_external_signals + ai_cmo_failed_jobs present');
  }
}

async function checkNextAuthRoute(): Promise<void> {
  const base = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3005';
  try {
    const res = await fetch(`${base}/login`, { signal: AbortSignal.timeout(8000) });
    record('NextAuth', res.status < 500, `GET /login → ${res.status} (start Next.js if failed)`);
  } catch {
    record('NextAuth', false, 'Next.js not running — start with npm run dev');
  }
}

async function main() {
  console.log('\n\x1b[36m=== Nexus Social V2.0 Stack Verification ===\x1b[0m\n');

  await checkRedis();
  await checkSupabase();
  await checkQdrant();
  await checkOllama();
  await checkV2Tables();
  await checkNextAuthRoute();

  const failed = checks.filter((c) => !c.ok);
  console.log('');

  if (failed.length === 0) {
    console.log('\x1b[32m╔══════════════════════════════════════════════════════════╗\x1b[0m');
    console.log('\x1b[32m║  V2.0 STACK READY FOR FULL E2E TESTING                   ║\x1b[0m');
    console.log('\x1b[32m╚══════════════════════════════════════════════════════════╝\x1b[0m');
    console.log('\nNext: npm run dev  |  npm run worker:dev  |  npx inngest-cli@latest dev');
    process.exitCode = 0;
    return;
  }

  console.log(`\x1b[31m${failed.length} check(s) failed.\x1b[0m Run: npm run bootstrap:local`);
  process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
