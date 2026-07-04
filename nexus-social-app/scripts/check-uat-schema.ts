import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv() {
  for (const file of ['.env', '.env.local']) {
    const p = join(root, file);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq <= 0) continue;
      process.env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
    }
  }
}

async function main() {
  loadEnv();
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const tables = [
    'workspaces',
    'api_keys',
    'brands',
    'ai_cmo_campaigns',
    'ai_cmo_budget_policies',
    'ai_cmo_external_signals',
    'ai_cmo_failed_jobs',
    'account_intent_scores',
    'attribution_reports',
    'crm_activity_mirror',
    'abm_playbook_runs',
    'enterprise_leads',
  ];

  for (const table of tables) {
    const { error } = await sb.from(table).select('*').limit(1);
    console.log(`${table}: ${error ? 'MISSING' : 'OK'}`);
  }

  const { error: evalColError } = await sb
    .from('ai_cmo_evaluations')
    .select('auto_rejected')
    .limit(1);
  console.log(`ai_cmo_evaluations.auto_rejected: ${evalColError ? 'MISSING' : 'OK'}`);

  const { error: auditError } = await sb.from('audit_logs').select('actor_id').limit(1);
  console.log(`audit_logs: ${auditError ? 'MISSING' : 'OK'}`);
}

main();
