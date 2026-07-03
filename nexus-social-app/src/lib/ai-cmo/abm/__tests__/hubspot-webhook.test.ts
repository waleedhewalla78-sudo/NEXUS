import { describe, expect, it, vi } from 'vitest';
import {
  extractClosedWonDeals,
  isClosedWonStageValue,
  parseHubSpotWebhookEvents,
  verifyHubSpotWebhook,
} from '@/lib/ai-cmo/abm/hubspot-webhook';
import crypto from 'node:crypto';

describe('HubSpot webhook parsing', () => {
  it('detects closed won stage values', () => {
    expect(isClosedWonStageValue('closedwon')).toBe(true);
    expect(isClosedWonStageValue('Closed Won')).toBe(true);
    expect(isClosedWonStageValue('appointmentscheduled')).toBe(false);
  });

  it('extracts closed-won deal with amount from batch', () => {
    const events = parseHubSpotWebhookEvents([
      {
        subscriptionType: 'deal.propertyChange',
        objectId: 999,
        portalId: 12345,
        propertyName: 'dealstage',
        propertyValue: 'closedwon',
        occurredAt: 1_700_000_000_000,
      },
      {
        subscriptionType: 'deal.propertyChange',
        objectId: 999,
        propertyName: 'amount',
        propertyValue: '250000',
      },
    ]);

    const deals = extractClosedWonDeals(events);
    expect(deals).toHaveLength(1);
    expect(deals[0]?.dealId).toBe('999');
    expect(deals[0]?.dealValue).toBe(250_000);
    expect(deals[0]?.portalId).toBe('12345');
  });

  it('ignores non-closed-won deal events', () => {
    const deals = extractClosedWonDeals([
      {
        subscriptionType: 'deal.propertyChange',
        objectId: 1,
        propertyName: 'dealstage',
        propertyValue: 'qualifiedtobuy',
      },
    ]);
    expect(deals).toHaveLength(0);
  });

  it('verifies v1 signature when secret set', () => {
    const secret = 'test-hubspot-secret';
    const body = '[{"objectId":1}]';
    const sig = crypto.createHash('sha256').update(secret + body).digest('hex');

    process.env.HUBSPOT_WEBHOOK_SECRET = secret;
    const req = new Request('http://localhost/api/integrations/crm/webhook/hubspot', {
      method: 'POST',
      headers: { 'X-HubSpot-Signature': sig },
      body,
    });

    expect(verifyHubSpotWebhook(req, body)).toBe(true);
    delete process.env.HUBSPOT_WEBHOOK_SECRET;
  });

  it('skips verification in dev when secret unset', () => {
    delete process.env.HUBSPOT_WEBHOOK_SECRET;
    const prevNodeEnv = process.env.NODE_ENV;
    vi.stubEnv('NODE_ENV', 'development');
    const req = new Request('http://localhost/test', { method: 'POST' });
    expect(verifyHubSpotWebhook(req, '{}')).toBe(true);
    vi.stubEnv('NODE_ENV', prevNodeEnv ?? 'test');
  });
});
