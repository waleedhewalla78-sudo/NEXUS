import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import { syncPublishToCrm, mirrorCrmActivity, type CrmPlatform } from '@/lib/ai-cmo/abm/crm-sync';
import {
  calculateAttributionMetrics,
  persistAttributionReport,
} from '@/lib/ai-cmo/attribution/calculate';

/**
 * Bi-directional CRM sync — log Nexus publish activities and ingest closed-won deals.
 * POST /api/integrations/crm
 */
export async function POST(req: NextRequest) {
  const auth = await authenticateApiRequest(req);
  if (!auth.ok) return auth.response;

  let body: {
    action?: 'log_activity' | 'closed_won' | 'post_published';
    crmPlatform?: CrmPlatform;
    accountId?: string;
    accountDomain?: string;
    campaignId?: string;
    contentId?: string;
    channel?: string;
    dealValue?: number;
    payload?: Record<string, unknown>;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const action = body.action ?? 'log_activity';
  const crmPlatform = body.crmPlatform ?? 'generic';
  const accountId = body.accountId?.trim();

  if (!accountId) {
    return NextResponse.json({ error: 'accountId is required' }, { status: 400 });
  }

  const userId = auth.requestHeaders.get('x-user-id') ?? `api-${auth.workspaceId}`;

  if (action === 'post_published') {
    const result = await syncPublishToCrm({
      workspaceId: auth.workspaceId,
      userId,
      crmPlatform,
      accountId,
      accountDomain: body.accountDomain ?? null,
      activityType: 'post_published',
      campaignId: body.campaignId ?? null,
      contentId: body.contentId ?? null,
      channel: body.channel ?? null,
      dealValue: body.dealValue ?? null,
      payload: body.payload,
    });

    if (!result.mirror.ok) {
      return NextResponse.json({ error: result.mirror.error }, { status: 422 });
    }

    return NextResponse.json({
      id: result.mirror.id,
      status: 'synced',
      crmWebhookDelivered: result.webhookOk,
    });
  }

  if (action === 'closed_won') {
    const mirror = await mirrorCrmActivity({
      workspaceId: auth.workspaceId,
      userId,
      crmPlatform,
      accountId,
      accountDomain: body.accountDomain ?? null,
      activityType: 'closed_won',
      dealValue: body.dealValue ?? null,
      campaignId: body.campaignId ?? null,
      payload: body.payload,
    });

    if (!mirror.ok) {
      return NextResponse.json({ error: mirror.error }, { status: 422 });
    }

    const periodEnd = new Date();
    const periodStart = new Date(periodEnd);
    periodStart.setUTCDate(periodStart.getUTCDate() - 30);

    const metrics = await calculateAttributionMetrics({
      workspaceId: auth.workspaceId,
      userId,
      periodStart,
      periodEnd,
      campaignId: body.campaignId ?? null,
    });

    metrics.crmClosedWonValue = body.dealValue ?? metrics.crmClosedWonValue;

    const report = await persistAttributionReport({
      workspaceId: auth.workspaceId,
      userId,
      periodStart,
      periodEnd,
      campaignId: body.campaignId ?? null,
      metrics,
      reportType: 'crm_closed_won',
    });

    return NextResponse.json({
      mirrorId: mirror.id,
      reportId: report.ok ? report.id : null,
      status: 'closed_won_recorded',
    });
  }

  const mirror = await mirrorCrmActivity({
    workspaceId: auth.workspaceId,
    userId,
    crmPlatform,
    accountId,
    accountDomain: body.accountDomain ?? null,
    activityType: 'activity_logged',
    payload: body.payload,
  });

  if (!mirror.ok) {
    return NextResponse.json({ error: mirror.error }, { status: 422 });
  }

  return NextResponse.json({ id: mirror.id, status: 'logged' });
}
