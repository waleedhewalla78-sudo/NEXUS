/**
 * Feature 006 Phase 3 — Demo audited thread: ABM seed → Concierge inbound → CRM mirror link.
 *
 * Usage:
 *   PILOT_WORKSPACE_ID=<uuid> npx tsx scripts/generate-006-audited-thread.ts
 *
 * Optional:
 *   PILOT_ACCOUNT_DOMAIN=acme-telecom.demo
 *   PILOT_CONVERSATION_ID=demo-006-thread
 *
 * Does not modify campaign-workflow (CL-030).
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { processConversationInbound } from '../src/lib/ai-cmo/conversation/process-inbound';
import {
  buildAuditedThread,
  conversationMetadataFromAbmSeed,
  crmMirrorMetadataForThread,
} from '../src/lib/ai-cmo/conversation/audited-thread';

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
      const key = t.slice(0, eq).trim();
      const val = t.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

async function main() {
  loadEnv();
  process.env.CONCIERGE_RULES_ONLY = 'true';

  const workspaceId = process.env.PILOT_WORKSPACE_ID;
  if (!workspaceId) {
    console.error('PILOT_WORKSPACE_ID required');
    process.exit(1);
  }

  const domain = process.env.PILOT_ACCOUNT_DOMAIN ?? 'acme-telecom.demo';
  const conversationId = process.env.PILOT_CONVERSATION_ID ?? `demo-006-${Date.now()}`;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: account } = await supabase
    .from('account_intent_scores')
    .select('id, account_name, domain')
    .eq('workspace_id', workspaceId)
    .eq('domain', domain)
    .maybeSingle();

  const accountIntentId = (account?.id as string | undefined) ?? '00000000-0000-0000-0000-000000000001';
  const playbookRunId = `demo-run-${Date.now()}`;
  const campaignJobId = `demo-job-${Date.now()}`;

  const seed = {
    abmPlaybookRunId: playbookRunId,
    accountIntentId,
    accountDomain: domain,
    campaignJobId,
    accountName: (account?.account_name as string | undefined) ?? 'Demo Telecom',
  };

  const inbound = await processConversationInbound({
    workspaceId,
    conversationId,
    channel: 'whatsapp',
    locale: 'en-US',
    inboundText: `Interested in buying enterprise AI for ${domain}. Budget 120k. Email revops@${domain} next month.`,
    metadata: conversationMetadataFromAbmSeed(seed),
  });

  const thread = buildAuditedThread({
    abmPlaybookRunId: playbookRunId,
    accountIntentId,
    accountDomain: domain,
    campaignJobId,
    qualificationId: inbound.qualificationId ?? null,
    qualifiedLeadId: inbound.leadId ?? null,
    crmMirrorId: null,
  });

  const mirrorMeta = crmMirrorMetadataForThread({
    accountDomain: domain,
    abmPlaybookRunId: playbookRunId,
    qualificationId: inbound.qualificationId,
    qualifiedLeadId: inbound.leadId,
  });

  console.log(JSON.stringify({ inbound, thread, mirrorMeta }, null, 2));
  if (!inbound.ok) process.exit(2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
