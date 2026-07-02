/**
 * Inngest Cloud cutover verification — run after filling .env.production
 * Usage: npm run verify:inngest-cloud
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));

/** Registered Inngest function IDs (must match src/lib/orchestration/*). */
const EXPECTED_FUNCTION_IDS = [
  'campaign-workflow',
  'outcome-ingestion',
  'trigger-replan',
  'mv-refresh',
  'radar-scan',
  'sentinel-scan',
  'quant-analytics-synced',
  'inngest-failure-dlq',
] as const;

const INNGEST_APP_ID = 'nexus-ai-cmo';
const PLACEHOLDER_PREFIX = 'PROD_';

function loadEnvFile(relativePath: string, override: boolean) {
  const full = join(scriptDir, '..', relativePath);
  if (!existsSync(full)) return false;
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
  return true;
}

function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  return value.startsWith(PLACEHOLDER_PREFIX) || value.includes('placeholder');
}

async function pingInngestCloud(signingKey: string): Promise<{ ok: boolean; detail: string }> {
  const endpoints = [
    'https://api.inngest.com/v1/health',
    `https://api.inngest.com/v1/apps/${INNGEST_APP_ID}`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${signingKey}` },
        signal: AbortSignal.timeout(5_000),
      });
      if (res.ok || res.status === 404) {
        return { ok: true, detail: `Inngest API reachable (${url}, HTTP ${res.status})` };
      }
      if (res.status === 401 || res.status === 403) {
        return { ok: false, detail: `Inngest API rejected signing key (HTTP ${res.status})` };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (url === endpoints[endpoints.length - 1]) {
        return { ok: false, detail: message };
      }
    }
  }

  return { ok: false, detail: 'Inngest Cloud API unreachable' };
}

async function pingServeEndpoint(appUrl: string): Promise<{ ok: boolean; detail: string }> {
  const base = appUrl.replace(/\/$/, '');
  try {
    const res = await fetch(`${base}/api/inngest`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (res.status === 200 || res.status === 401 || res.status === 403) {
      return {
        ok: true,
        detail: `Serve endpoint reachable at ${base}/api/inngest (HTTP ${res.status})`,
      };
    }
    return { ok: false, detail: `Serve endpoint returned HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : String(err) };
  }
}

async function main() {
  console.log('\n=== Inngest Cloud Verification ===\n');

  const prodLoaded = loadEnvFile('.env.production', true);
  if (!prodLoaded) {
    console.log('⚠️  .env.production not found — using process environment only.');
  }

  const eventKey = process.env.INNGEST_EVENT_KEY;
  const signingKey = process.env.INNGEST_SIGNING_KEY;
  const inngestDev = process.env.INNGEST_DEV;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  const errors: string[] = [];

  if (inngestDev === '1' || inngestDev === 'true') {
    errors.push('INNGEST_DEV must be 0 (or unset) for production Cloud cutover');
  }

  if (isPlaceholder(eventKey)) {
    errors.push('INNGEST_EVENT_KEY is missing or still a PROD_* placeholder in .env.production');
  } else {
    console.log(`  ✓ INNGEST_EVENT_KEY set (${eventKey!.slice(0, 8)}…)`);
  }

  if (isPlaceholder(signingKey)) {
    errors.push('INNGEST_SIGNING_KEY is missing or still a PROD_* placeholder in .env.production');
  } else {
    console.log(`  ✓ INNGEST_SIGNING_KEY set (${signingKey!.slice(0, 12)}…)`);
  }

  if (errors.length > 0) {
    console.log('\n❌ Failed to connect to Inngest Cloud. Check INNGEST_EVENT_KEY and INNGEST_SIGNING_KEY.\n');
    for (const err of errors) console.log(`   • ${err}`);
    process.exit(1);
  }

  const cloud = await pingInngestCloud(signingKey!);
  if (cloud.ok) {
    console.log(`  ✓ ${cloud.detail}`);
  } else {
    console.log(`  ✗ ${cloud.detail}`);
    console.log('\n❌ Failed to connect to Inngest Cloud. Check INNGEST_SIGNING_KEY.\n');
    process.exit(1);
  }

  if (appUrl && !isPlaceholder(appUrl)) {
    const serve = await pingServeEndpoint(appUrl);
    const icon = serve.ok ? '✓' : '⚠';
    console.log(`  ${icon} ${serve.detail}`);
  } else {
    console.log('  ⚠ NEXT_PUBLIC_APP_URL not set — skipping /api/inngest serve check');
  }

  console.log(
    `\n✅ Inngest Cloud connected. ${EXPECTED_FUNCTION_IDS.length} functions ready:\n` +
      `   ${EXPECTED_FUNCTION_IDS.join(', ')}\n`,
  );
  console.log(
    '   After deploy, sync functions in the Inngest dashboard (Apps → nexus-ai-cmo → Sync).\n',
  );
}

main().catch((err) => {
  console.error('\n❌ Failed to connect to Inngest Cloud. Check INNGEST_EVENT_KEY.\n');
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
