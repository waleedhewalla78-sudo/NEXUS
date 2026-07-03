#!/usr/bin/env tsx
/**
 * GET ${NEXT_PUBLIC_APP_URL}/api/health — used by verify:production:deploy
 */
export {};

async function main() {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  if (!base) {
    console.error('NEXT_PUBLIC_APP_URL required');
    process.exit(1);
  }

  const url = `${base}/api/health`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) {
    console.error(`health HTTP ${res.status} from ${url}`);
    process.exit(1);
  }

  const body = (await res.json()) as { status?: string; details?: { db?: string } };
  if (body.status !== 'ok') {
    console.error('health status != ok', body);
    process.exit(1);
  }
  if (body.details?.db && body.details.db !== 'up') {
    console.error('db != up', body.details);
    process.exit(1);
  }

  console.log(`health OK: ${url}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
