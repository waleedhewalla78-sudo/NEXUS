/**
 * CRM activity mirror — persists inbound CRM events for attribution joins.
 */

import { SorTableNames, type SyncToSoRResult } from '@/lib/ai-cmo/types/reconciler';
import { secureSyncToSoR } from '@/lib/ai-cmo/utils/secure-reconciler-writer';
import { ingestAttributionEvent } from '@/lib/ai-cmo/attribution/ingest';

export type CrmPlatform = 'hubspot' | 'salesforce' | 'generic';

export type CrmSyncInput = {
  workspaceId: string;
  userId: string;
  crmPlatform: CrmPlatform;
  accountId: string;
  accountDomain?: string | null;
  activityType: 'post_published' | 'closed_won' | 'activity_logged';
  dealValue?: number | null;
  campaignId?: string | null;
  contentId?: string | null;
  channel?: string | null;
  payload?: Record<string, unknown>;
};

export async function mirrorCrmActivity(input: CrmSyncInput): Promise<SyncToSoRResult> {
  return secureSyncToSoR({
    table: SorTableNames.CRM_ACTIVITY_MIRROR,
    workspaceId: input.workspaceId,
    userId: input.userId,
    auditAction: 'abm.crm.activity_mirrored',
    auditMetadata: {
      crmPlatform: input.crmPlatform,
      accountId: input.accountId,
      activityType: input.activityType,
    },
    data: {
      workspace_id: input.workspaceId,
      crm_platform: input.crmPlatform,
      account_id: input.accountId,
      account_domain: input.accountDomain ?? null,
      activity_type: input.activityType,
      deal_value: input.dealValue ?? null,
      payload: input.payload ?? {},
      occurred_at: new Date().toISOString(),
    },
  });
}

export async function syncPublishToCrm(input: CrmSyncInput): Promise<{ mirror: SyncToSoRResult; webhookOk: boolean }> {
  const mirror = await mirrorCrmActivity(input);

  let webhookOk = false;
  const crmWebhookUrl = process.env.CRM_WEBHOOK_URL;
  if (crmWebhookUrl) {
    const body =
      input.crmPlatform === 'hubspot'
        ? {
            properties: {
              hs_activity_type: 'social_post',
              hs_note_body: `Nexus AI published post for account ${input.accountId}`,
              nexus_campaign_id: input.campaignId,
            },
          }
        : {
            Subject: 'Nexus Social — AI Post Published',
            Description: `Campaign ${input.campaignId ?? 'n/a'} published for account ${input.accountId}`,
            AccountId: input.accountId,
          };

    try {
      const res = await fetch(crmWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      webhookOk = res.ok;
    } catch {
      webhookOk = false;
    }
  }

  if (input.campaignId) {
    await ingestAttributionEvent({
      workspaceId: input.workspaceId,
      userId: input.userId,
      visitorId: `crm:${input.accountId}`,
      eventType: 'click',
      campaignId: input.campaignId,
      contentId: input.contentId ?? null,
      channel: input.channel ?? input.crmPlatform,
      agentName: 'crm_sync',
      value: input.dealValue ?? null,
    });
  }

  return { mirror, webhookOk };
}

export const crmSyncUtils = {
  mirrorCrmActivity,
  syncPublishToCrm,
};
