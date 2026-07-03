/**
 * Salesforce inbound webhook — closed-won opportunities → crm_activity_mirror.
 */

import crypto from 'node:crypto';

export type SalesforceOpportunityPayload = {
  Id?: string;
  AccountId?: string;
  Amount?: number | string;
  StageName?: string;
  CloseDate?: string;
  Account?: { Website?: string; Domain?: string; Name?: string };
};

function normalizeDomain(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '');
}

export function verifySalesforceWebhook(req: Request, rawBody: string): boolean {
  const secret = process.env.SALESFORCE_WEBHOOK_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[Salesforce Webhook] SALESFORCE_WEBHOOK_SECRET missing in production');
      return false;
    }
    console.warn('[Salesforce Webhook] SALESFORCE_WEBHOOK_SECRET not set — skipping verification in dev');
    return true;
  }

  const signature =
    req.headers.get('x-salesforce-signature') ??
    req.headers.get('X-Salesforce-Signature');

  if (!signature) return false;

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return signature === expected;
  }
}

export function isClosedWonOpportunity(payload: SalesforceOpportunityPayload): boolean {
  const stage = String(payload.StageName ?? '').toLowerCase();
  return stage.includes('closed won') || stage === 'closedwon';
}

export function parseSalesforceClosedWon(
  payload: SalesforceOpportunityPayload,
): {
  accountId: string;
  dealValue: number | null;
  accountDomain: string | null;
  occurredAt: string;
} | null {
  if (!isClosedWonOpportunity(payload)) return null;

  const oppId = payload.Id ?? payload.AccountId;
  if (!oppId) return null;

  const rawAmount = payload.Amount;
  const dealValue =
    rawAmount != null && Number.isFinite(Number(rawAmount)) ? Number(rawAmount) : null;

  const domainRaw = payload.Account?.Website ?? payload.Account?.Domain ?? '';
  const accountDomain = domainRaw ? normalizeDomain(domainRaw) : null;

  return {
    accountId: `salesforce-opp-${oppId}`,
    dealValue,
    accountDomain,
    occurredAt: payload.CloseDate
      ? new Date(payload.CloseDate).toISOString()
      : new Date().toISOString(),
  };
}
