import { NextRequest, NextResponse } from 'next/server';
import { mirrorCrmActivity } from '@/lib/ai-cmo/abm/crm-sync';
import {
  parseSalesforceClosedWon,
  verifySalesforceWebhook,
  type SalesforceOpportunityPayload,
} from '@/lib/ai-cmo/abm/salesforce-webhook';
import {
  calculateAttributionMetrics,
  persistAttributionReport,
} from '@/lib/ai-cmo/attribution/calculate';

/**
 * Salesforce inbound webhook — closed-won opportunities → crm_activity_mirror.
 * POST /api/integrations/crm/webhook/salesforce?workspaceId=<uuid>
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  if (!verifySalesforceWebhook(req, rawBody)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const workspaceId =
    req.nextUrl.searchParams.get('workspaceId') ??
    process.env.SALESFORCE_WEBHOOK_WORKSPACE_ID ??
    process.env.NEXT_PUBLIC_DEFAULT_WORKSPACE_ID;

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });
  }

  let payload: SalesforceOpportunityPayload;
  try {
    payload = JSON.parse(rawBody) as SalesforceOpportunityPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = parseSalesforceClosedWon(payload);
  if (!parsed) {
    return NextResponse.json({ status: 'ignored', reason: 'not_closed_won' });
  }

  const userId = 'salesforce-webhook';

  const mirror = await mirrorCrmActivity({
    workspaceId,
    userId,
    crmPlatform: 'salesforce',
    accountId: parsed.accountId,
    accountDomain: parsed.accountDomain,
    activityType: 'closed_won',
    dealValue: parsed.dealValue,
    payload: { source: 'salesforce_webhook', raw: payload },
  });

  if (!mirror.ok) {
    return NextResponse.json({ error: mirror.error }, { status: 422 });
  }

  const periodEnd = new Date(parsed.occurredAt);
  const periodStart = new Date(periodEnd);
  periodStart.setUTCDate(periodStart.getUTCDate() - 30);

  const metrics = await calculateAttributionMetrics({ workspaceId, userId, periodStart, periodEnd });
  if (parsed.dealValue != null) {
    metrics.crmClosedWonValue = parsed.dealValue;
  }

  const report = await persistAttributionReport({
    workspaceId,
    userId,
    periodStart,
    periodEnd,
    metrics,
    reportType: 'crm_closed_won',
  });

  return NextResponse.json({
    status: 'closed_won_recorded',
    mirrorId: mirror.id,
    reportId: report.ok ? report.id : null,
  });
}
