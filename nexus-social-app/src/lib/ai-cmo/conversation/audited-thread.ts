/**
 * Feature 006 Phase 3 — ABM → Concierge → CRM audited thread helpers (FR-090).
 * Pure builders — no campaign-workflow changes (CL-030).
 */

import type { AbmConversationSeed } from '@/lib/ai-cmo/abm/activate-playbook';

export type AuditedThreadLink = {
  abmPlaybookRunId: string;
  accountIntentId: string;
  accountDomain: string;
  campaignJobId: string;
  qualificationId?: string | null;
  qualifiedLeadId?: string | null;
  crmMirrorId?: string | null;
};

/** Metadata to attach on conversation inbound after ABM activate. */
export function conversationMetadataFromAbmSeed(
  seed: AbmConversationSeed,
): Record<string, unknown> {
  return {
    abmPlaybookRunId: seed.abmPlaybookRunId,
    accountIntentId: seed.accountIntentId,
    accountDomain: seed.accountDomain,
    campaignJobId: seed.campaignJobId,
    accountName: seed.accountName,
    auditedThread: true,
  };
}

/** Build exportable audit chain for attribution / case study. */
export function buildAuditedThread(input: AuditedThreadLink): {
  chain: string[];
  joinKey: string;
  links: AuditedThreadLink;
} {
  return {
    chain: [
      `abm_playbook_runs:${input.abmPlaybookRunId}`,
      `account_intent_scores:${input.accountIntentId}`,
      `campaign_job:${input.campaignJobId}`,
      input.qualificationId
        ? `conversation_qualifications:${input.qualificationId}`
        : 'conversation_qualifications:pending',
      input.qualifiedLeadId
        ? `qualified_leads:${input.qualifiedLeadId}`
        : 'qualified_leads:pending',
      input.crmMirrorId
        ? `crm_activity_mirror:${input.crmMirrorId}`
        : `crm_activity_mirror:domain:${input.accountDomain}`,
    ],
    joinKey: input.accountDomain,
    links: input,
  };
}

/** CRM mirror payload fields that preserve the conversational audit link. */
export function crmMirrorMetadataForThread(input: {
  accountDomain: string;
  abmPlaybookRunId?: string | null;
  qualificationId?: string | null;
  qualifiedLeadId?: string | null;
}): Record<string, unknown> {
  return {
    account_domain: input.accountDomain,
    abm_playbook_run_id: input.abmPlaybookRunId ?? null,
    qualification_id: input.qualificationId ?? null,
    qualified_lead_id: input.qualifiedLeadId ?? null,
    source: 'feature_006_audited_thread',
  };
}
