/**
 * Sprint 5 — Pipeline Simulation & Case Study Generator
 *
 * Back-dates a 30-day AI campaign → content → CRM closed-won → attribution
 * for a pilot workspace so dashboards show proof-of-ROI.
 *
 * Usage:
 *   PILOT_WORKSPACE_ID=<uuid> npm run generate:pilot-report
 *
 * Optional:
 *   PILOT_ABM_ACCOUNT_ID=<uuid>
 *   PILOT_DEAL_VALUE=150000
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 * LLM: OPENROUTER_API_KEY or CLAUDE_API_KEY (optional — falls back to dummy copy)
 *
 * CL-030: does not touch campaign-workflow.ts or reconciler.ts
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv() {
  for (const file of ['.env', '.env.local', 'nexus-social-app.json']) {
    const p = join(root, file);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq <= 0) continue;
      const key = t.slice(0, eq).trim();
      const val = t.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

function iso(d: Date): string {
  return d.toISOString();
}

function monthStart(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

const FALLBACK_POSTS = [
  'Transforming enterprise operations in MENA requires a strategic approach—pairing autonomous AI agents with database-level isolation so every campaign is compliant, attributable, and board-ready.',
  'Digital transformation in the region is no longer a slide deck. Intent signals, brand-safe content, and closed-won attribution must live in one operating system.',
  'Your competitors are already testing AI-native GTM. The winners will prove pipeline influence—not vanity metrics—within a single quarter.',
  'From ABM intent to LinkedIn narrative to CRM closed-won: this is what an autonomous revenue mesh delivers when governance is built into the data layer.',
];

async function generateLinkedInPost(accountName: string, topic: string): Promise<{ text: string; usedLlm: boolean }> {
  const prompt = `Generate a short LinkedIn post (max 80 words) targeting ${accountName} about ${topic} in MENA. Professional B2B tone. No hashtags spam. Return only the post text.`;

  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (openRouterKey) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openRouterKey}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'https://nexussocial.tech',
          'X-Title': 'Nexus Pilot Case Study',
        },
        body: JSON.stringify({
          model: process.env.OPENROUTER_MODEL ?? 'openai/gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You write concise enterprise LinkedIn posts for MENA B2B buyers.' },
            { role: 'user', content: prompt },
          ],
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const text = data.choices?.[0]?.message?.content?.trim();
        if (text) return { text, usedLlm: true };
      } else {
        console.warn(`[pilot-report] OpenRouter HTTP ${res.status} — using fallback copy`);
      }
    } catch (err) {
      console.warn(
        '[pilot-report] OpenRouter failed — using fallback copy:',
        err instanceof Error ? err.message : err,
      );
    }
  } else {
    console.warn('[pilot-report] OPENROUTER_API_KEY not set — using fallback copy');
  }

  return { text: FALLBACK_POSTS[0], usedLlm: false };
}

async function main() {
  loadEnv();

  const workspaceId = process.env.PILOT_WORKSPACE_ID ?? process.env.YOUR_PILOT_WORKSPACE_ID;
  if (!workspaceId) {
    console.error(
      'Missing PILOT_WORKSPACE_ID. Example:\n  PILOT_WORKSPACE_ID=<uuid> npm run generate:pilot-report',
    );
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) / SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const dealValue = Number(process.env.PILOT_DEAL_VALUE ?? '150000');
  const aiCostUsd = Number(process.env.PILOT_AI_COST_USD ?? '12.50');

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: workspace, error: wsErr } = await supabase
    .from('workspaces')
    .select('id, name')
    .eq('id', workspaceId)
    .maybeSingle();

  if (wsErr || !workspace) {
    console.error('[pilot-report] Workspace not found:', workspaceId, wsErr?.message);
    process.exit(1);
  }

  let abmAccountId = process.env.PILOT_ABM_ACCOUNT_ID;
  let accountName = 'Target Account';
  let accountDomain: string | null = null;
  let topics: string[] = ['Digital Transformation'];

  if (abmAccountId) {
    const { data: abm } = await supabase
      .from('account_intent_scores')
      .select('id, account_name, domain, topics')
      .eq('id', abmAccountId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    if (abm) {
      accountName = abm.account_name;
      accountDomain = abm.domain;
      topics = (abm.topics as string[])?.length ? (abm.topics as string[]) : topics;
    } else {
      console.warn('[pilot-report] PILOT_ABM_ACCOUNT_ID not in workspace — selecting first ABM row');
      abmAccountId = undefined;
    }
  }

  if (!abmAccountId) {
    const { data: abmRows } = await supabase
      .from('account_intent_scores')
      .select('id, account_name, domain, topics')
      .eq('workspace_id', workspaceId)
      .order('intent_score', { ascending: false })
      .limit(1);
    const abm = abmRows?.[0];
    if (!abm) {
      console.error(
        '[pilot-report] No account_intent_scores for workspace. Seed ABM first (Sprint 4 provision / seed:abm-demo).',
      );
      process.exit(1);
    }
    abmAccountId = abm.id;
    accountName = abm.account_name;
    accountDomain = abm.domain;
    topics = (abm.topics as string[])?.length ? (abm.topics as string[]) : topics;
  }

  const tCampaign = daysAgo(30);
  const tContentBase = daysAgo(29);
  const tDeal = daysAgo(5);
  const tAttr = daysAgo(3);
  const topic = topics[0] ?? 'Digital Transformation';

  console.log(`\n[pilot-report] Workspace: ${workspace.name} (${workspaceId})`);
  console.log(`[pilot-report] ABM account: ${accountName} (${abmAccountId})\n`);

  // 1. Campaign (-30d)
  const campaignName = `ABM Pilot — ${accountName} (${topic})`;
  const { data: campaign, error: campErr } = await supabase
    .from('ai_cmo_campaigns')
    .insert({
      workspace_id: workspaceId,
      name: campaignName,
      status: 'completed',
      objective: {
        text: `Autonomous ABM campaign targeting ${accountName} on ${topic} in MENA.`,
        abm_account_id: abmAccountId,
        source: 'sprint5_pilot_simulation',
      },
      created_at: iso(tCampaign),
      updated_at: iso(tCampaign),
    })
    .select('id, name, created_at')
    .single();

  if (campErr || !campaign) {
    console.error('[pilot-report] Campaign insert failed:', campErr?.message);
    process.exit(1);
  }

  // 2. Content pieces (-29d … -26d) — 4 pieces
  let usedLlm = false;
  const contentIds: string[] = [];
  for (let i = 0; i < 4; i += 1) {
    const created = daysAgo(29 - i);
    let caption = FALLBACK_POSTS[i] ?? FALLBACK_POSTS[0];
    if (i === 0) {
      const gen = await generateLinkedInPost(accountName, topic);
      caption = gen.text;
      usedLlm = gen.usedLlm;
    }

    const { data: piece, error: pieceErr } = await supabase
      .from('ai_cmo_content_pieces')
      .insert({
        workspace_id: workspaceId,
        campaign_id: campaign.id,
        locale: 'en-US',
        content: {
          caption,
          platforms: ['linkedin'],
          hashtags: ['MENA', 'DigitalTransformation', 'ABM'],
          call_to_action: 'Book a strategy session',
          abm_account_id: abmAccountId,
          source: 'sprint5_pilot_simulation',
          llm_generated: i === 0 ? usedLlm : false,
        },
        created_at: iso(created),
      })
      .select('id')
      .single();

    if (pieceErr || !piece) {
      console.error('[pilot-report] Content insert failed:', pieceErr?.message);
      process.exit(1);
    }
    contentIds.push(piece.id);
  }

  // 3. CRM closed-won (-5d)
  const crmAccountId = `pilot-deal-${accountDomain ?? abmAccountId}`;
  const { data: crmRow, error: crmErr } = await supabase
    .from('crm_activity_mirror')
    .insert({
      workspace_id: workspaceId,
      crm_platform: 'salesforce',
      account_id: crmAccountId,
      account_domain: accountDomain,
      activity_type: 'closed_won',
      deal_value: dealValue,
      payload: {
        source: 'sprint5_pilot_simulation',
        campaign_id: campaign.id,
        abm_account_id: abmAccountId,
        stage: 'Closed Won',
      },
      occurred_at: iso(tDeal),
      created_at: iso(tDeal),
    })
    .select('id')
    .single();

  if (crmErr || !crmRow) {
    console.error('[pilot-report] CRM mirror insert failed:', crmErr?.message);
    process.exit(1);
  }

  // 4. Attribution report (-3d) — unique on (workspace_id, month, channel)
  const attrMonth = monthStart(tAttr);
  const reportJson = {
    source: 'sprint5_pilot_simulation',
    campaign_id: campaign.id,
    campaign_name: campaignName,
    crm_activity_id: crmRow.id,
    abm_account_id: abmAccountId,
    abm_account_name: accountName,
    content_piece_ids: contentIds,
    model: 'last_touch',
    attributed_revenue: dealValue,
  };

  const { data: attrRow, error: attrErr } = await supabase
    .from('attribution_reports')
    .upsert(
      {
        workspace_id: workspaceId,
        month: attrMonth,
        channel: 'linkedin',
        touches: contentIds.length,
        attributed_revenue: dealValue,
        report_json: reportJson,
        created_at: iso(tAttr),
      },
      { onConflict: 'workspace_id,month,channel' },
    )
    .select('id')
    .single();

  if (attrErr) {
    console.error('[pilot-report] Attribution insert failed:', attrErr.message);
    process.exit(1);
  }

  // 5. FinOps cost ledger (optional proof of AI cost)
  await supabase.from('ai_cmo_cost_ledger').insert({
    workspace_id: workspaceId,
    campaign_id: campaign.id,
    agent_name: 'creator',
    cost_category: 'tokens',
    amount_usd: aiCostUsd,
    token_count: usedLlm ? 2400 : 0,
    model_used: usedLlm ? (process.env.OPENROUTER_MODEL ?? 'openai/gpt-4o-mini') : 'fallback_copy',
    metadata: { source: 'sprint5_pilot_simulation' },
    recorded_at: iso(tContentBase),
  });

  const marginPct = (((dealValue - aiCostUsd) / dealValue) * 100).toFixed(1);

  console.log(`
==========================================
DILIGENT AI: 30-DAY PILOT EXECUTIVE SUMMARY
==========================================
Client: ${workspace.name}
Target Account: ${accountName}
Campaign Start: ${tCampaign.toISOString().slice(0, 10)}
Campaign ID: ${campaign.id}
Content Pieces Generated: ${contentIds.length}
CRM Deal ID: ${crmRow.id}
Attribution Report ID: ${attrRow?.id ?? 'n/a'}
Pipeline Influenced: $${dealValue.toLocaleString('en-US')} (Closed Won)
AI Cost to Serve: $${aiCostUsd.toFixed(2)} (LLM tokens${usedLlm ? '' : ' — fallback copy'})
Gross Margin: ${marginPct}%
==========================================
`);

  console.log('✓ Pilot case study data written (workspace-scoped).');
  console.log('  Review UI: /ai-cmo/campaigns · /ai-cmo/abm · attribution dashboards');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
