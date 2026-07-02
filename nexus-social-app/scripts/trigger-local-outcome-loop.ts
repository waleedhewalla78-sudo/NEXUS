/**
 * Feature 004 V2.0 — Closed-loop trigger (post_analytics → outcome-ingestion → Quant).
 *
 * Proves the analytics → outcomes → mesh path without waiting for 2 AM cron.
 *
 * Usage:
 *   npm run trigger-local-outcome-loop -- --campaignId <uuid>
 *   npx tsx scripts/trigger-local-outcome-loop.ts --campaignId <uuid>
 *
 * Prerequisites: Terminals 1–5 running (see docs/HUMAN-UAT-PLAYBOOK.md).
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { runOutcomeIngestion } from '../src/jobs/ai-cmo/outcome-ingestion';
import { sendAiCmoInngestEvent } from '../src/lib/orchestration/inngest-client';
import { AI_CMO_INNGEST_EVENT_NAMES } from '../src/lib/orchestration/types/events';

const scriptDir = dirname(fileURLToPath(import.meta.url));

type CampaignRow = {
  id: string;
  workspace_id: string;
  post_id: string | null;
};

type ContentPieceRow = {
  id: string;
  post_id: string | null;
  campaign_id: string | null;
};

type OutcomeRow = {
  id: string;
  campaign_id: string;
  impressions: number | null;
  clicks: number | null;
  conversions: number | null;
  roi_ratio: number | null;
  revenue_attributed: number | null;
  cost: number | null;
};

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

function parseCampaignId(): string {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--campaignId' && args[i + 1]) {
      return args[++i]!;
    }
    if (args[i]?.startsWith('--campaignId=')) {
      return args[i].slice('--campaignId='.length);
    }
  }
  const positional = args.find((a) => !a.startsWith('--'));
  if (positional) return positional;

  console.error(`
🔴 Missing campaignId.

Usage:
  npm run trigger-local-outcome-loop -- --campaignId <uuid>
  npx tsx scripts/trigger-local-outcome-loop.ts --campaignId <uuid>
`);
  process.exit(1);
}

function createSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('🔴 Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

async function ensurePostAnalyticsConversionsColumn(supabase: SupabaseClient): Promise<void> {
  const { error } = await supabase.from('post_analytics').select('conversions').limit(0);
  if (error && /conversions|column/i.test(error.message)) {
    console.error(`
🔴 post_analytics.conversions column missing — outcome-ingestion requires it.

Run in Supabase SQL Editor:
  ALTER TABLE post_analytics ADD COLUMN IF NOT EXISTS conversions INT DEFAULT 0;
`);
    process.exit(1);
  }
}

async function resolvePostId(
  supabase: SupabaseClient,
  campaignId: string,
  campaign: CampaignRow,
): Promise<string> {
  if (campaign.post_id) return campaign.post_id;

  const { data: piece } = await supabase
    .from('ai_cmo_content_pieces')
    .select('id, post_id, campaign_id')
    .eq('campaign_id', campaignId)
    .not('post_id', 'is', null)
    .limit(1)
    .maybeSingle();

  const row = piece as ContentPieceRow | null;
  if (row?.post_id) return row.post_id;

  console.error(`
🔴 No post_id linked to campaign ${campaignId}.

Run Phase 2 live integration first (npm run test:live-integration) so link-post persists a post_id.
`);
  process.exit(1);
}

async function insertMockPostAnalytics(
  supabase: SupabaseClient,
  workspaceId: string,
  postId: string,
  campaignId: string,
): Promise<void> {
  const externalPostId = `local-loop-${campaignId.slice(0, 8)}-${Date.now()}`;
  const row = {
    workspace_id: workspaceId,
    post_id: postId,
    platform: 'local-test',
    external_post_id: externalPostId,
    impressions: 12_500,
    clicks: 840,
    conversions: 42,
    engagement_rate: 0.0672,
    synced_at: new Date().toISOString(),
    raw_payload: {
      source: 'trigger-local-outcome-loop',
      cost_usd: 5.5,
      conversions: 42,
    },
  };

  const { error } = await supabase.from('post_analytics').insert(row);
  if (error) {
    console.error('🔴 Failed to insert post_analytics:', error.message);
    process.exit(1);
  }

  console.log(`  🟢 Inserted post_analytics for post_id=${postId} (impressions=12500, conversions=42)`);
}

async function emitAnalyticsSynced(
  workspaceId: string,
  campaignId: string,
  postId: string,
): Promise<void> {
  const syncedAt = new Date().toISOString();
  const result = await sendAiCmoInngestEvent({
    name: AI_CMO_INNGEST_EVENT_NAMES.ANALYTICS_SYNCED,
    data: {
      workspaceId,
      postId,
      campaignId,
      syncedAt,
      metrics: {
        impressions: 12_500,
        clicks: 840,
        conversions: 42,
        engagement_rate: 0.0672,
      },
    },
  });

  console.log(
    `  🟢 Emitted ${AI_CMO_INNGEST_EVENT_NAMES.ANALYTICS_SYNCED} (Quant consumer: quant-analytics-synced)`,
  );
  console.log(`     Inngest event ids: ${result.ids.join(', ') || '(stub — start Inngest dev server)'}`);
}

async function invokeOutcomeIngestion(): Promise<void> {
  console.log('  ⏳ Invoking outcome-ingestion handler (runOutcomeIngestion)...');
  const summary = await runOutcomeIngestion();
  console.log(
    `  🟢 outcome-ingestion complete — synced=${summary.synced} updated=${summary.updated} skipped=${summary.skipped} errors=${summary.errors}`,
  );
}

async function fetchOutcome(
  supabase: SupabaseClient,
  campaignId: string,
): Promise<OutcomeRow> {
  const { data, error } = await supabase
    .from('ai_cmo_campaign_outcomes')
    .select('id, campaign_id, impressions, clicks, conversions, roi_ratio, revenue_attributed, cost')
    .eq('campaign_id', campaignId)
    .order('id', { ascending: false })
    .limit(1);

  if (error || !data?.length) {
    console.error('🔴 No row in ai_cmo_campaign_outcomes after ingestion.');
    console.error('   Ensure ai_cmo_content_pieces links post_id → campaign_id for this campaign.');
    process.exit(1);
  }

  return data[0] as OutcomeRow;
}

async function main() {
  const campaignId = parseCampaignId();

  console.log('\n\x1b[36m╔══════════════════════════════════════════════════════════════╗\x1b[0m');
  console.log('\x1b[36m║  V2.0 CLOSED-LOOP TRIGGER — post_analytics → outcomes → Quant ║\x1b[0m');
  console.log('\x1b[36m╚══════════════════════════════════════════════════════════════╝\x1b[0m\n');

  const supabase = createSupabase();
  await ensurePostAnalyticsConversionsColumn(supabase);

  const { data: campaign, error: campErr } = await supabase
    .from('ai_cmo_campaigns')
    .select('id, workspace_id, post_id')
    .eq('id', campaignId)
    .maybeSingle();

  if (campErr || !campaign) {
    console.error(`🔴 Campaign not found: ${campaignId}`);
    process.exit(1);
  }

  const typedCampaign = campaign as CampaignRow;
  const workspaceId = typedCampaign.workspace_id;
  const postId = await resolvePostId(supabase, campaignId, typedCampaign);

  console.log(`  ⏳ campaignId=${campaignId}`);
  console.log(`  ⏳ workspaceId=${workspaceId}`);
  console.log(`  ⏳ postId=${postId}\n`);

  console.log('\x1b[36m── Step 1/5: Insert mock post_analytics ──\x1b[0m');
  await insertMockPostAnalytics(supabase, workspaceId, postId, campaignId);

  console.log('\x1b[36m── Step 2/5: Emit ai-cmo/analytics.synced (Quant mesh) ──\x1b[0m');
  await emitAnalyticsSynced(workspaceId, campaignId, postId);

  console.log('\x1b[36m── Step 3/5: Invoke outcome-ingestion (Inngest fn id: outcome-ingestion) ──\x1b[0m');
  await invokeOutcomeIngestion();

  console.log('\x1b[36m── Step 4/5: Verify ai_cmo_campaign_outcomes ──\x1b[0m');
  const outcome = await fetchOutcome(supabase, campaignId);

  console.log('\x1b[36m── Step 5/5: Success ──\x1b[0m');
  console.log(`
\x1b[32m╔══════════════════════════════════════════════════════════════╗
║  🎉 CLOSED-LOOP TRIGGER — SUCCESS                            ║
╚══════════════════════════════════════════════════════════════╝\x1b[0m

  outcome_id:     ${outcome.id}
  campaign_id:    ${outcome.campaign_id}
  impressions:    ${outcome.impressions ?? 0}
  conversions:    ${outcome.conversions ?? 0}
  roi_ratio:      ${outcome.roi_ratio ?? 'n/a'}
  revenue_usd:    ${outcome.revenue_attributed ?? 0}
  cost_usd:       ${outcome.cost ?? 0}

  Next: Watch Terminal 5 for quant-analytics-synced run.
  Optional: Trigger replan via Inngest Dev UI (see Appendix A in playbook).
`);
}

main().catch((err) => {
  console.error('\n🔴 Unexpected error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
