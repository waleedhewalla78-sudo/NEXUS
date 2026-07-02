/**
 * One-off login + Supabase status check. Usage: node scripts/check-login-status.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv(file) {
  const p = join(root, file);
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq <= 0) continue;
    process.env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
  }
}

loadEnv('.env');
loadEnv('.env.local');

const PROJECT_REF = 'lnlzxaqockpjezxskmnb';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3005';
const DEMO_EMAIL = 'demo@nexussocial.io';
const DEMO_PASSWORD = 'DemoWalk2026!';

const report = {
  projectRef: PROJECT_REF,
  envUrlMatchesProject: url.includes(PROJECT_REF),
  supabase: {},
  demoUser: {},
  loginPage: {},
  appHealth: {},
};

async function main() {
  // Supabase REST
  try {
    const res = await fetch(`${url}/rest/v1/workspaces?select=id&limit=1`, {
      headers: { apikey: service, Authorization: `Bearer ${service}` },
      signal: AbortSignal.timeout(15000),
    });
    report.supabase.rest = { ok: res.ok, status: res.status };
  } catch (e) {
    report.supabase.rest = { ok: false, error: e.message };
  }

  // Demo sign-in (same API the login form uses)
  try {
    const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: anon, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
      signal: AbortSignal.timeout(15000),
    });
    const body = await res.json().catch(() => ({}));
    report.demoUser.signIn = {
      ok: res.ok,
      status: res.status,
      message: body.error_description || body.msg || (res.ok ? 'OK' : 'failed'),
    };
  } catch (e) {
    report.demoUser.signIn = { ok: false, error: e.message };
  }

  // Demo user in DB
  const sb = createClient(url, service);
  const { data: authUsers } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 });
  const demo = authUsers?.users?.find((u) => u.email?.toLowerCase() === DEMO_EMAIL);
  report.demoUser.exists = Boolean(demo?.id);
  report.demoUser.emailConfirmed = Boolean(demo?.email_confirmed_at);

  // Login page
  try {
    const res = await fetch(`${appUrl}/login`, { signal: AbortSignal.timeout(10000) });
    const html = await res.text();
    report.loginPage = {
      ok: res.ok,
      status: res.status,
      hasSignInTab: html.includes('Sign in to Nexus Social'),
      hasSignUpTab: html.includes('Sign up'),
    };
  } catch (e) {
    report.loginPage = { ok: false, error: e.message };
  }

  // App health (may reflect stale dev server env)
  try {
    const res = await fetch(`${appUrl}/api/health`, { signal: AbortSignal.timeout(60000) });
    const body = await res.json().catch(() => ({}));
    report.appHealth = {
      status: res.status,
      db: body.details?.db,
      redis: body.details?.redis,
      overall: body.details?.overall,
    };
  } catch (e) {
    report.appHealth = { error: e.message };
  }

  console.log(JSON.stringify(report, null, 2));
  const loginReady =
    report.envUrlMatchesProject &&
    report.supabase.rest?.ok &&
    report.demoUser.signIn?.ok &&
    report.demoUser.exists &&
    report.loginPage.ok;

  console.log('\n--- VERDICT ---');
  console.log(loginReady ? 'LOGIN READY FOR TEST' : 'LOGIN NOT FULLY READY — see report above');
  process.exit(loginReady ? 0 : 1);
}

main();
