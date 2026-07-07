#!/usr/bin/env tsx
/**
 * Phase D — Human / commercial gate readiness checker.
 *
 * Usage:
 *   npm run verify:phase-d              # env + DB checks
 *   npm run verify:phase-d -- --report  # write artifacts/qa/PHASE-D-*.md
 *   npm run verify:phase-d -- --live    # also probe NEXT_PUBLIC_APP_URL
 *
 * Does NOT submit Meta App Review or OAuth — reports readiness only.
 */
import { createClient } from '@supabase/supabase-js';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = join(scriptDir, '..');
const writeReport = process.argv.includes('--report');
const liveProbe = process.argv.includes('--live');

type Status = 'PASS' | 'FAIL' | 'WARN' | 'SKIP' | 'HUMAN';
type Row = { id: string; gate: string; check: string; status: Status; detail: string; owner: string };

const rows: Row[] = [];

function loadEnv() {
  for (const file of ['.env', '.env.local', '.env.production']) {
    const full = join(root, file);
    if (!existsSync(full)) continue;
    for (const line of readFileSync(full, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

function envStatus(name: string): 'SET' | 'MISSING' | 'PLACEHOLDER' {
  const v = process.env[name]?.trim() ?? '';
  if (!v) return 'MISSING';
  if (
    /\$\{PROD_|placeholder|your_|changeme|^xxx$|sk_test_|signkey-local/i.test(v) ||
    v.includes('YOUR_PROJECT')
  ) {
    return 'PLACEHOLDER';
  }
  return 'SET';
}

function add(id: string, gate: string, check: string, status: Status, detail: string, owner: string) {
  rows.push({ id, gate, check, status, detail, owner });
  const icon =
    status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : status === 'WARN' ? '!' : status === 'HUMAN' ? '◆' : '·';
  console.log(`  [${icon}] ${id} ${check} — ${detail}`);
}

function checkEnvGroup(
  gate: string,
  prefix: string,
  keys: string[],
  owner: string,
  required = true,
) {
  for (const key of keys) {
    const s = envStatus(key);
    const status: Status =
      s === 'SET' ? 'PASS' : required ? (s === 'PLACEHOLDER' ? 'WARN' : 'FAIL') : s === 'PLACEHOLDER' ? 'SKIP' : 'WARN';
    add(`${prefix}-${key}`, gate, key, status, s, owner);
  }
}

function expectedRedirect(platform: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3005').replace(/\/$/, '');
  return `${base}/api/oauth/${platform}/callback`;
}

async function main() {
  loadEnv();
  console.log('\n=== Phase D Gate Readiness ===\n');

  // B4 — Production secrets
  console.log('B4 — Production secrets');
  checkEnvGroup('B4', 'B4', [
    'NEXT_PUBLIC_APP_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'DATABASE_URL',
    'REDIS_URL',
    'INNGEST_SIGNING_KEY',
    'INNGEST_EVENT_KEY',
    'INTERNAL_TOOL_SECRET',
    'TOKEN_ENCRYPTION_KEY',
    'APPROVAL_HMAC_SECRET',
    'NEXTAUTH_SECRET',
  ], 'DevOps');

  // G4 — LLM + feature flags
  console.log('\nG4 — LLM + enterprise flags');
  const ollama = envStatus('USE_LOCAL_OLLAMA');
  add(
    'G4-ollama-off',
    'G4',
    'USE_LOCAL_OLLAMA=false (prod)',
    ollama === 'MISSING' || process.env.USE_LOCAL_OLLAMA === 'false' ? 'PASS' : 'WARN',
    `USE_LOCAL_OLLAMA=${process.env.USE_LOCAL_OLLAMA ?? 'unset'}`,
    'DevOps',
  );
  checkEnvGroup('G4', 'G4', ['DIFY_API_KEY', 'OPENROUTER_API_KEY'], 'DevOps', false);
  const saas = process.env.NEXT_PUBLIC_ENABLE_SaaS_UI ?? 'false';
  add(
    'G4-saas-ui',
    'G4',
    'Enterprise skin (SaaS UI off)',
    saas !== 'true' ? 'PASS' : 'WARN',
    `NEXT_PUBLIC_ENABLE_SaaS_UI=${saas}`,
    'DevOps',
  );

  // B2 — OAuth credentials
  console.log('\nB2 — OAuth credentials');
  checkEnvGroup('B2', 'B2', [
    'META_APP_ID',
    'META_APP_SECRET',
    'LINKEDIN_CLIENT_ID',
    'LINKEDIN_CLIENT_SECRET',
    'X_CLIENT_ID',
    'X_CLIENT_SECRET',
  ], 'Product');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? '';
  for (const [platform, envKey] of [
    ['meta', 'META_OAUTH_REDIRECT_URI'],
    ['linkedin', 'LINKEDIN_OAUTH_REDIRECT_URI'],
    ['x', 'X_OAUTH_REDIRECT_URI'],
  ] as const) {
    const configured = process.env[envKey]?.replace(/\/$/, '') ?? '';
    const expected = expectedRedirect(platform);
    const ok = !configured || configured === expected;
    add(
      `B2-redirect-${platform}`,
      'B2',
      `${envKey} matches APP_URL`,
      ok ? 'PASS' : 'WARN',
      configured ? `${configured} (expected ${expected})` : `default ${expected}`,
      'Product',
    );
  }

  // B1 — Meta App Review (human + DB)
  console.log('\nB1 — Meta App Review');
  add(
    'B1-human',
    'B1',
    'Meta App Review submitted',
    'HUMAN',
    'Follow docs/OPS-META-APP-REVIEW.md — blocks FB/IG publish only',
    'Product',
  );

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (url && serviceKey && envStatus('SUPABASE_SERVICE_ROLE_KEY') === 'SET') {
    const supabase = createClient(url, serviceKey);
    const { data: workspaces, error } = await supabase
      .from('workspaces')
      .select('id, name, meta_app_review_status')
      .limit(20);

    if (error) {
      add('B1-db', 'B1', 'workspaces.meta_app_review_status', 'WARN', error.message, 'DevOps');
    } else {
      const approved = (workspaces ?? []).filter((w) => w.meta_app_review_status === 'approved');
      add(
        'B1-db',
        'B1',
        'workspace meta_app_review_status=approved',
        approved.length > 0 ? 'PASS' : 'FAIL',
        approved.length > 0
          ? `${approved.length} workspace(s) approved`
          : 'No workspace approved — FB/IG publish blocked',
        'Product',
      );
    }

    // B2 — OAuth connections in DB
    console.log('\nB2 — Live OAuth connections (DB)');
    const { data: connections, error: connErr } = await supabase
      .from('workspace_social_connections')
      .select('platform, workspace_id, disconnected_at')
      .is('disconnected_at', null);

    if (connErr) {
      add('B2-conn', 'B2', 'workspace_social_connections', 'WARN', connErr.message, 'QA');
    } else {
      const platforms = new Set((connections ?? []).map((c) => c.platform));
      for (const p of ['facebook', 'linkedin', 'x', 'instagram']) {
        const connected = platforms.has(p);
        add(
          `B2-conn-${p}`,
          'B2',
          `OAuth connected: ${p}`,
          connected ? 'PASS' : 'HUMAN',
          connected ? 'active connection in DB' : 'Connect via /settings on live URL',
          'QA',
        );
      }
    }
  } else {
    add('B1-db', 'B1', 'Supabase service role', 'SKIP', 'SUPABASE_SERVICE_ROLE_KEY not set', 'DevOps');
    add('B2-conn', 'B2', 'OAuth DB check', 'SKIP', 'Supabase not configured', 'QA');
  }

  // B3 — Executive sign-off
  console.log('\nB3 — Executive sign-off');
  const signoffPath = join(root, 'docs/UAT-SIGNOFF-RESULTS.md');
  const signoffExists = existsSync(signoffPath);
  const signoffText = signoffExists ? readFileSync(signoffPath, 'utf8') : '';
  const execPending = signoffText.includes('⬜ Pending') || signoffText.includes('| | | ⬜');
  add(
    'B3-exec',
    'B3',
    'Leadership sign-off in UAT-SIGNOFF-RESULTS.md',
    execPending ? 'HUMAN' : signoffExists ? 'PASS' : 'HUMAN',
    execPending ? 'Executive rows still pending' : 'Review docs/UAT-SIGNOFF-RESULTS.md',
    'Leadership',
  );

  // Commercial gates
  console.log('\nCommercial — S4 / S6 / S5');
  add(
    'S5-OPS',
    'Commercial',
    'generate:pilot-report on prod workspace',
    'HUMAN',
    'PILOT_WORKSPACE_ID=… npm run generate:pilot-report (on VPS host, not container)',
    'Founder',
  );
  add(
    'S6-PAY',
    'Commercial',
    'Client #1 payment',
    'HUMAN',
    'Unlock phrase: Sprint 6 Ready — Pit Crew blocked per CL-036',
    'Founder',
  );
  add(
    'S4-ENG',
    'Commercial',
    'provision-pilot-client.ts',
    'HUMAN',
    'After signed pilot only (CL-033) — script not shipped until sale',
    'Eng',
  );

  // Worker / publish
  console.log('\nDeploy — worker + publishing');
  const publishing = (process.env.PUBLISHING_ENABLED ?? 'true').toLowerCase() !== 'false';
  add(
    'DEP-publish',
    'Deploy',
    'PUBLISHING_ENABLED',
    publishing ? 'PASS' : 'WARN',
    `PUBLISHING_ENABLED=${process.env.PUBLISHING_ENABLED ?? 'true'}`,
    'DevOps',
  );
  add(
    'DEP-worker',
    'Deploy',
    'Redis publish worker running',
    'HUMAN',
    'Confirm nexus-social-worker container in docker-compose.prod.yml',
    'DevOps',
  );

  // Live probe
  if (liveProbe && appUrl) {
    console.log('\nLive probe');
    try {
      const health = await fetch(`${appUrl}/api/health`, { signal: AbortSignal.timeout(15_000) });
      const body = (await health.json()) as { status?: string; details?: { db?: string } };
      add(
        'LIVE-health',
        'Deploy',
        'GET /api/health',
        health.ok && body.status === 'ok' ? 'PASS' : 'FAIL',
        `HTTP ${health.status} db=${body.details?.db ?? 'n/a'}`,
        'DevOps',
      );
      const intel = await fetch(`${appUrl}/intelligence`, {
        redirect: 'manual',
        signal: AbortSignal.timeout(15_000),
      });
      add(
        'LIVE-intel',
        'Deploy',
        'GET /intelligence',
        [200, 302, 307].includes(intel.status) ? 'PASS' : 'FAIL',
        `HTTP ${intel.status}`,
        'QA',
      );
    } catch (err) {
      add(
        'LIVE-health',
        'Deploy',
        'Live URL probe',
        'FAIL',
        err instanceof Error ? err.message : 'probe failed',
        'DevOps',
      );
    }
  }

  // Summary
  const pass = rows.filter((r) => r.status === 'PASS').length;
  const fail = rows.filter((r) => r.status === 'FAIL').length;
  const warn = rows.filter((r) => r.status === 'WARN').length;
  const human = rows.filter((r) => r.status === 'HUMAN').length;
  const skip = rows.filter((r) => r.status === 'SKIP').length;

  console.log(`\n=== Summary: ${pass} PASS · ${fail} FAIL · ${warn} WARN · ${human} HUMAN · ${skip} SKIP ===`);
  console.log('\nHuman gates cannot be closed by code — see docs/OPS-PHASE-D-INTEGRATION.md\n');

  if (writeReport) {
    const dir = join(root, 'artifacts/qa');
    mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const path = join(dir, `PHASE-D-${stamp}.md`);
    const md = [
      '# Phase D Gate Report',
      '',
      `**Generated:** ${new Date().toISOString()}`,
      `**APP_URL:** ${appUrl || 'not set'}`,
      '',
      `**Summary:** ${pass} PASS · ${fail} FAIL · ${warn} WARN · ${human} HUMAN · ${skip} SKIP`,
      '',
      '| ID | Gate | Check | Status | Owner | Detail |',
      '|----|------|-------|--------|-------|--------|',
      ...rows.map(
        (r) => `| ${r.id} | ${r.gate} | ${r.check} | ${r.status} | ${r.owner} | ${r.detail.replace(/\|/g, '/')} |`,
      ),
      '',
      '**Next:** [`OPS-PHASE-D-INTEGRATION.md`](../docs/OPS-PHASE-D-INTEGRATION.md)',
    ].join('\n');
    writeFileSync(path, md, 'utf8');
    console.log(`Report: ${path}`);
  }

  // Exit: FAIL only on automated FAIL (not HUMAN). Use exitCode to avoid libuv crash on Windows.
  if (fail > 0) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
