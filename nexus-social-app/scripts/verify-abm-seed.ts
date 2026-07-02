/**
 * Quick verification after seed:abm-demo
 * Usage: npm run verify:abm-seed
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv() {
  for (const file of ['.env', '.env.local', '.uat-secrets.local']) {
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
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3005';
  const workspaceId = '11111111-1111-1111-1111-111111111111';

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const { data: accounts, count: accountCount } = await sb
    .from('account_intent_scores')
    .select('account_name, intent_score, buyer_stage', { count: 'exact' })
    .eq('workspace_id', workspaceId)
    .order('intent_score', { ascending: false });

  const { count: attrCount } = await sb
    .from('attribution_reports')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId);

  const { count: crmCount } = await sb
    .from('crm_activity_mirror')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId);

  console.log('\n=== ABM seed verification (DB) ===');
  console.log(`account_intent_scores: ${accountCount ?? 0} rows`);
  for (const a of accounts ?? []) {
    console.log(`  · ${a.account_name} — ${a.intent_score}/100 (${a.buyer_stage})`);
  }
  console.log(`attribution_reports: ${attrCount ?? 0} rows`);
  console.log(`crm_activity_mirror: ${crmCount ?? 0} rows`);

  const apiKey = process.env.NEXUS_API_KEY ?? process.env.UAT_API_KEY;
  if (!apiKey) {
    console.log('\n=== API smoke (skipped — no NEXUS_API_KEY) ===');
    console.log('Run: npm run ensure:uat-api-key then re-run verify:abm-seed');
    return;
  }

  console.log('\n=== ABM API smoke ===');
  const accountsRes = await fetch(`${baseUrl}/api/v1/ai-cmo/abm/accounts`, {
    headers: { 'x-api-key': apiKey },
  });
  const accountsBody = await accountsRes.json();
  console.log(`GET /api/v1/ai-cmo/abm/accounts → ${accountsRes.status}`);
  console.log(`  configured: ${accountsBody.configured}, count: ${accountsBody.accounts?.length ?? 0}`);

  const attrRes = await fetch(`${baseUrl}/api/v1/ai-cmo/abm/attribution`, {
    headers: { 'x-api-key': apiKey },
  });
  const attrBody = await attrRes.json();
  console.log(`GET /api/v1/ai-cmo/abm/attribution → ${attrRes.status}`);
  console.log(`  configured: ${attrBody.configured}, rows: ${attrBody.rows?.length ?? 0}`);

  if (!accountsRes.ok || !accountsBody.configured) {
    process.exit(1);
  }
  console.log('\n✓ ABM live data ready for demo');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
