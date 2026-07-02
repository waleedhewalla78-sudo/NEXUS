/**
 * Seeds enterprise ABM demo data for UAT / CTO demo workspace.
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local
 *
 * Usage: npm run seed:abm-demo
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!supabaseUrl || !serviceKey) {
  console.error('[seed-abm] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

const DEMO_WORKSPACE_ID = '11111111-1111-1111-1111-111111111111';

const ACCOUNTS = [
  {
    account_name: 'Vodafone Egypt',
    domain: 'vodafone.com.eg',
    industry: 'Telecommunications',
    intent_score: 88,
    buyer_stage: 'decision',
    topics: ['AI Automation', '5G'],
  },
  {
    account_name: 'Cairo Bank',
    domain: 'cairobank.com',
    industry: 'Financial Services',
    intent_score: 58,
    buyer_stage: 'consideration',
    topics: ['Digital Transformation'],
  },
  {
    account_name: 'Etisalat Egypt',
    domain: 'etisalat.eg',
    industry: 'Telecommunications',
    intent_score: 28,
    buyer_stage: 'awareness',
    topics: ['Telecom'],
  },
  {
    account_name: 'Carrefour Egypt',
    domain: 'carrefour.eg',
    industry: 'Retail',
    intent_score: 52,
    buyer_stage: 'consideration',
    topics: ['Retail Tech'],
  },
  {
    account_name: 'Abu Dhabi Commercial Bank',
    domain: 'adcb.com',
    industry: 'Financial Services',
    intent_score: 79,
    buyer_stage: 'decision',
    topics: ['FinTech'],
  },
] as const;

/** 3 months of social → revenue attribution (Apr–Jun 2026) */
const ATTRIBUTION_ROWS = [
  { month: '2026-04-01', channel: 'linkedin', touches: 142, attributed_revenue: 18500 },
  { month: '2026-04-01', channel: 'whatsapp', touches: 89, attributed_revenue: 12400 },
  { month: '2026-04-01', channel: 'x', touches: 56, attributed_revenue: 4200 },
  { month: '2026-04-01', channel: 'email', touches: 34, attributed_revenue: 6800 },
  { month: '2026-05-01', channel: 'linkedin', touches: 168, attributed_revenue: 22100 },
  { month: '2026-05-01', channel: 'whatsapp', touches: 102, attributed_revenue: 15800 },
  { month: '2026-05-01', channel: 'x', touches: 61, attributed_revenue: 5100 },
  { month: '2026-05-01', channel: 'email', touches: 41, attributed_revenue: 7900 },
  { month: '2026-06-01', channel: 'linkedin', touches: 195, attributed_revenue: 28400 },
  { month: '2026-06-01', channel: 'whatsapp', touches: 118, attributed_revenue: 19200 },
  { month: '2026-06-01', channel: 'x', touches: 72, attributed_revenue: 6400 },
  { month: '2026-06-01', channel: 'email', touches: 48, attributed_revenue: 9100 },
];

const CRM_TOUCHPOINTS = [
  { domain: 'vodafone.com.eg', count: 12 },
  { domain: 'cairobank.com', count: 7 },
  { domain: 'etisalat.eg', count: 3 },
  { domain: 'carrefour.eg', count: 5 },
  { domain: 'adcb.com', count: 9 },
];

async function main() {
  console.log('[seed-abm] Upserting account_intent_scores for workspace', DEMO_WORKSPACE_ID);

  for (const account of ACCOUNTS) {
    const { error } = await supabase.from('account_intent_scores').upsert(
      {
        workspace_id: DEMO_WORKSPACE_ID,
        ...account,
        last_updated: new Date().toISOString(),
      },
      { onConflict: 'workspace_id,domain' },
    );

    if (error) {
      console.error(`[seed-abm] account ${account.domain}:`, error.message);
      process.exit(1);
    }
    console.log(`  ✓ ${account.account_name} (${account.intent_score}/100, ${account.buyer_stage})`);
  }

  console.log('[seed-abm] Upserting attribution_reports (3 months × 4 channels)');

  for (const row of ATTRIBUTION_ROWS) {
    const { error } = await supabase.from('attribution_reports').upsert(
      {
        workspace_id: DEMO_WORKSPACE_ID,
        month: row.month,
        channel: row.channel,
        touches: row.touches,
        attributed_revenue: row.attributed_revenue,
        report_json: {
          seeded: true,
          narrative: 'Social touches converting to attributed revenue',
          channel: row.channel,
        },
      },
      { onConflict: 'workspace_id,month,channel' },
    );

    if (error) {
      console.error(`[seed-abm] attribution ${row.month}/${row.channel}:`, error.message);
      process.exit(1);
    }
  }
  console.log(`  ✓ ${ATTRIBUTION_ROWS.length} attribution rows`);

  console.log('[seed-abm] Inserting crm_activity_mirror touchpoints');

  for (const { domain, count } of CRM_TOUCHPOINTS) {
    for (let i = 0; i < count; i++) {
      const { error } = await supabase.from('crm_activity_mirror').insert({
        workspace_id: DEMO_WORKSPACE_ID,
        crm_platform: 'hubspot',
        account_id: `${domain}-${i + 1}`,
        account_domain: domain,
        activity_type: i === count - 1 ? 'closed_won' : 'meeting',
        deal_value: i === count - 1 ? 25000 + count * 1000 : null,
        payload: { seeded: true, sequence: i + 1 },
      });

      if (error) {
        console.error(`[seed-abm] crm ${domain}:`, error.message);
        process.exit(1);
      }
    }
    console.log(`  ✓ ${domain}: ${count} touchpoints`);
  }

  console.log('[seed-abm] Done — ABM dashboard will fetch live data via GET /api/v1/ai-cmo/abm/accounts');
}

main().catch((err) => {
  console.error('[seed-abm] Fatal:', err);
  process.exit(1);
});
