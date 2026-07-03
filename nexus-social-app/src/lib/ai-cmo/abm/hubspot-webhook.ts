/**
 * HubSpot inbound webhook — signature verification and closed-won deal parsing.
 * @see https://developers.hubspot.com/docs/api/webhooks/validating-requests
 */

import crypto from 'node:crypto';

export type HubSpotWebhookEvent = {
  eventId?: number;
  subscriptionId?: number;
  portalId?: number;
  objectId?: number;
  propertyName?: string;
  propertyValue?: string;
  changeSource?: string;
  subscriptionType?: string;
  attemptNumber?: number;
  occurredAt?: number;
};

export type ParsedClosedWonDeal = {
  dealId: string;
  portalId: string | null;
  dealValue: number | null;
  accountDomain: string | null;
  occurredAt: string;
};

const CLOSED_WON_STAGE = /closed\s*won|closedwon/i;

function normalizeDomain(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '');
}

export function verifyHubSpotWebhook(req: Request, rawBody: string): boolean {
  const secret = process.env.HUBSPOT_WEBHOOK_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[HubSpot Webhook] HUBSPOT_WEBHOOK_SECRET missing in production');
      return false;
    }
    console.warn('[HubSpot Webhook] HUBSPOT_WEBHOOK_SECRET not set — skipping verification in dev');
    return true;
  }

  const signatureV3 = req.headers.get('x-hubspot-signature-v3');
  const timestamp = req.headers.get('x-hubspot-request-timestamp');
  if (signatureV3 && timestamp) {
    const url = new URL(req.url);
    const uri = `${url.pathname}${url.search}`;
    const method = req.method.toUpperCase();
    const maxAgeMs = 5 * 60 * 1000;
    const ts = Number(timestamp);
    if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > maxAgeMs) {
      return false;
    }
    const source = `${method}${uri}${rawBody}${timestamp}`;
    const expected = crypto.createHmac('sha256', secret).update(source).digest('base64');
    try {
      return crypto.timingSafeEqual(Buffer.from(signatureV3), Buffer.from(expected));
    } catch {
      return signatureV3 === expected;
    }
  }

  const signatureV1 =
    req.headers.get('x-hubspot-signature') ?? req.headers.get('X-HubSpot-Signature');
  if (!signatureV1) {
    return false;
  }

  const expectedV1 = crypto.createHash('sha256').update(secret + rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signatureV1), Buffer.from(expectedV1));
  } catch {
    return signatureV1 === expectedV1;
  }
}

export function isClosedWonStageValue(value: string | undefined): boolean {
  if (!value) return false;
  return CLOSED_WON_STAGE.test(value.trim());
}

export function parseHubSpotWebhookEvents(raw: unknown): HubSpotWebhookEvent[] {
  if (Array.isArray(raw)) {
    return raw as HubSpotWebhookEvent[];
  }
  if (raw && typeof raw === 'object') {
    return [raw as HubSpotWebhookEvent];
  }
  return [];
}

/**
 * Collapse a HubSpot webhook batch into closed-won deal records.
 * Handles dealstage + amount + associated company domain property changes.
 */
export function extractClosedWonDeals(events: HubSpotWebhookEvent[]): ParsedClosedWonDeal[] {
  const dealMap = new Map<
    string,
    {
      portalId: string | null;
      dealValue: number | null;
      accountDomain: string | null;
      closedWon: boolean;
      occurredAt: string;
    }
  >();

  const domainByDeal = new Map<string, string>();

  for (const event of events) {
    const subscriptionType = String(event.subscriptionType ?? '');
    const objectId = event.objectId != null ? String(event.objectId) : null;
    if (!objectId) continue;

    const occurredAt = event.occurredAt
      ? new Date(event.occurredAt).toISOString()
      : new Date().toISOString();

    if (subscriptionType.startsWith('deal.')) {
      const existing = dealMap.get(objectId) ?? {
        portalId: event.portalId != null ? String(event.portalId) : null,
        dealValue: null,
        accountDomain: null,
        closedWon: false,
        occurredAt,
      };

      if (event.propertyName === 'dealstage' && isClosedWonStageValue(event.propertyValue)) {
        existing.closedWon = true;
      }
      if (event.propertyName === 'amount' && event.propertyValue != null) {
        const amount = Number(event.propertyValue);
        if (Number.isFinite(amount) && amount >= 0) {
          existing.dealValue = amount;
        }
      }
      if (event.propertyName === 'domain' && event.propertyValue) {
        existing.accountDomain = normalizeDomain(event.propertyValue);
      }

      existing.occurredAt = occurredAt;
      dealMap.set(objectId, existing);
    }

    if (subscriptionType.startsWith('company.') && event.propertyName === 'domain' && event.propertyValue) {
      domainByDeal.set(objectId, normalizeDomain(event.propertyValue));
    }
  }

  const results: ParsedClosedWonDeal[] = [];

  for (const [dealId, deal] of dealMap) {
    if (!deal.closedWon) continue;
    results.push({
      dealId,
      portalId: deal.portalId,
      dealValue: deal.dealValue,
      accountDomain: deal.accountDomain ?? domainByDeal.get(dealId) ?? null,
      occurredAt: deal.occurredAt,
    });
  }

  return results;
}

export const hubspotWebhookUtils = {
  verifyHubSpotWebhook,
  parseHubSpotWebhookEvents,
  extractClosedWonDeals,
  isClosedWonStageValue,
};
