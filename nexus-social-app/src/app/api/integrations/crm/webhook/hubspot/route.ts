import { NextRequest, NextResponse } from 'next/server';
import { mirrorCrmActivity } from '@/lib/ai-cmo/abm/crm-sync';
import {
  extractClosedWonDeals,
  parseHubSpotWebhookEvents,
  verifyHubSpotWebhook,
} from '@/lib/ai-cmo/abm/hubspot-webhook';
import {
  calculateAttributionMetrics,
  persistAttributionReport,
} from '@/lib/ai-cmo/attribution/calculate';

/**
 * HubSpot inbound webhook — closed-won deals → crm_activity_mirror + attribution.
 * POST /api/integrations/crm/webhook/hubspot?workspaceId=<uuid>
 *
 * Configure in HubSpot: subscription deal.propertyChange (dealstage, amount).
 * Set HUBSPOT_WEBHOOK_SECRET to your HubSpot app client secret.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  if (!verifyHubSpotWebhook(req, rawBody)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const workspaceId =
    req.nextUrl.searchParams.get('workspaceId') ??
    process.env.HUBSPOT_WEBHOOK_WORKSPACE_ID ??
    process.env.NEXT_PUBLIC_DEFAULT_WORKSPACE_ID;

  if (!workspaceId) {
    return NextResponse.json(
      { error: 'workspaceId query param or HUBSPOT_WEBHOOK_WORKSPACE_ID required' },
      { status: 400 },
    );
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const events = parseHubSpotWebhookEvents(payload);
  const closedWonDeals = extractClosedWonDeals(events);

  if (closedWonDeals.length === 0) {
    return NextResponse.json({ status: 'ignored', processed: 0, events: events.length });
  }

  const userId = `hubspot-webhook:${closedWonDeals[0]?.portalId ?? 'unknown'}`;
  const results: Array<{ dealId: string; mirrorId?: string; reportId?: string; error?: string }> = [];

  for (const deal of closedWonDeals) {
    const accountId = `hubspot-deal-${deal.dealId}`;

    const mirror = await mirrorCrmActivity({
      workspaceId,
      userId,
      crmPlatform: 'hubspot',
      accountId,
      accountDomain: deal.accountDomain,
      activityType: 'closed_won',
      dealValue: deal.dealValue,
      payload: {
        hubspotDealId: deal.dealId,
        portalId: deal.portalId,
        source: 'hubspot_webhook',
        occurredAt: deal.occurredAt,
      },
    });

    if (!mirror.ok) {
      results.push({ dealId: deal.dealId, error: mirror.error });
      continue;
    }

    const periodEnd = new Date(deal.occurredAt);
    const periodStart = new Date(periodEnd);
    periodStart.setUTCDate(periodStart.getUTCDate() - 30);

    const metrics = await calculateAttributionMetrics({
      workspaceId,
      userId,
      periodStart,
      periodEnd,
    });

    if (deal.dealValue != null) {
      metrics.crmClosedWonValue = deal.dealValue;
    }

    const report = await persistAttributionReport({
      workspaceId,
      userId,
      periodStart,
      periodEnd,
      metrics,
      reportType: 'crm_closed_won',
    });

    results.push({
      dealId: deal.dealId,
      mirrorId: mirror.id,
      reportId: report.ok ? report.id : undefined,
    });
  }

  const failed = results.filter((r) => r.error);
  if (failed.length > 0 && failed.length === results.length) {
    return NextResponse.json({ error: 'All mirrors failed', results }, { status: 422 });
  }

  return NextResponse.json({
    status: 'closed_won_recorded',
    processed: results.filter((r) => !r.error).length,
    results,
  });
}
