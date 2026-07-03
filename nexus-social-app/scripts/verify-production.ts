#!/usr/bin/env tsx
/**
 * Production verification orchestrator — Prompt A ops close-out.
 *
 * Usage:
 *   npm run verify:production:code     # local CI gates, no server
 *   npm run verify:production:uat      # UAT gates (server optional for abm-seed)
 *   npm run verify:production:deploy   # live deploy checks (needs NEXT_PUBLIC_APP_URL)
 *   npm run verify:production          # all three in sequence
 */
import { spawnSync } from 'node:child_process';

type Step = { name: string; cmd: string; optional?: boolean; needsAppUrl?: boolean };

const CODE_STEPS: Step[] = [
  { name: 'typecheck', cmd: 'npm run typecheck' },
  { name: 'test:unit', cmd: 'npm run test:unit' },
  { name: 'schema:verify', cmd: 'npm run schema:verify' },
  { name: 'schema:verify:004', cmd: 'npm run schema:verify:004' },
];

const UAT_STEPS: Step[] = [
  { name: 'test:integration', cmd: 'npm run test:integration' },
  { name: 'uat:check-schema', cmd: 'npm run uat:check-schema' },
  { name: 'uat:postman-ab', cmd: 'npm run uat:postman-ab', optional: true },
  { name: 'test:live-integration', cmd: 'npm run test:live-integration', optional: true },
  { name: 'verify:abm-seed', cmd: 'npm run verify:abm-seed', optional: true },
];

const DEPLOY_STEPS: Step[] = [
  { name: 'verify:inngest-cloud', cmd: 'npm run verify:inngest-cloud', optional: true },
  { name: 'health-check', cmd: 'tsx scripts/verify-production-health.ts', needsAppUrl: true },
  { name: 'ai:verify', cmd: 'npm run ai:verify', optional: true },
];

function runStep(step: Step): boolean {
  if (step.needsAppUrl && !process.env.NEXT_PUBLIC_APP_URL) {
    console.warn(`[SKIP] ${step.name} — NEXT_PUBLIC_APP_URL not set`);
    return true;
  }

  console.log(`\n=== ${step.name} ===`);
  const result = spawnSync(step.cmd, {
    shell: true,
    stdio: 'inherit',
    env: process.env,
  });

  if (result.status === 0) return true;

  if (step.optional) {
    console.warn(`[WARN] ${step.name} failed (optional — set env / start server to pass)`);
    return true;
  }

  console.error(`[FAIL] ${step.name}`);
  return false;
}

function runSuite(label: string, steps: Step[]): boolean {
  console.log(`\n########## verify:production — ${label} ##########`);
  let ok = true;
  for (const step of steps) {
    if (!runStep(step)) ok = false;
  }
  return ok;
}

function main() {
  const mode = process.argv[2] ?? 'all';
  const results: Record<string, boolean> = {};

  if (mode === 'code' || mode === 'all') {
    results.code = runSuite('code', CODE_STEPS);
  }
  if (mode === 'uat' || mode === 'all') {
    results.uat = runSuite('uat', UAT_STEPS);
  }
  if (mode === 'deploy' || mode === 'all') {
    results.deploy = runSuite('deploy', DEPLOY_STEPS);
  }

  if (!['code', 'uat', 'deploy', 'all'].includes(mode)) {
    console.error('Usage: tsx scripts/verify-production.ts [code|uat|deploy|all]');
    process.exit(1);
  }

  console.log('\n========== Summary ==========');
  for (const [k, v] of Object.entries(results)) {
    console.log(`  ${k}: ${v ? 'PASS' : 'FAIL'}`);
  }

  const allPass = Object.values(results).every(Boolean);
  if (!allPass) process.exit(1);
  console.log('\nverify:production complete.');
}

main();
