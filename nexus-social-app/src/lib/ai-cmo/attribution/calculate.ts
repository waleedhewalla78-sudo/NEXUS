/**
 * Nightly attribution calculation — joins attribution events with CRM mirror data.
 */

import crypto from 'node:crypto';
import { SorTableNames, type SyncToSoRResult } from '@/lib/ai-cmo/types/reconciler';
import { secureSyncToSoR } from '@/lib/ai-cmo/utils/secure-reconciler-writer';
import { supabaseAdmin } from '@/lib/supabase/server';

export type AttributionModel = 'first_touch' | 'last_touch' | 'linear';

export type AttributionCalculationInput = {
  workspaceId: string;
  userId: string;
  periodStart: Date;
  periodEnd: Date;
  campaignId?: string | null;
};

export type AttributionMetrics = {
  firstTouch: { signups: number; revenue: number; touchpoints: number };
  lastTouch: { signups: number; revenue: number; touchpoints: number };
  linear: { signups: number; revenue: number; touchpoints: number };
  crmClosedWonValue: number;
  crmLinkedAccounts: number;
  crmLinkedClosedWonValue: number;
  linkedPosts: number;
  channelBreakdown: Record<string, { touches: number; revenue: number }>;
};

function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
}

function signReportPayload(secret: string, payload: Record<string, unknown>): string {
  return crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
}

function monthStartUtc(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

export async function calculateAttributionMetrics(
  input: AttributionCalculationInput,
): Promise<AttributionMetrics> {
  const startIso = input.periodStart.toISOString();
  const endIso = input.periodEnd.toISOString();

  let eventsQuery = supabaseAdmin
    .from('ai_cmo_attribution_events')
    .select('event_type, value, is_first_touch, campaign_id, channel, content_id')
    .eq('workspace_id', input.workspaceId)
    .gte('occurred_at', startIso)
    .lte('occurred_at', endIso);

  if (input.campaignId) {
    eventsQuery = eventsQuery.eq('campaign_id', input.campaignId);
  }

  const { data: eventsData, error: eventsError } = await eventsQuery;
  const events = eventsData ?? [];
  if (eventsError) {
    console.warn('[attribution-calc] events query failed:', eventsError.message);
  }

  const signupEvents = events.filter((e) => e.event_type === 'signup' || e.event_type === 'demo_request');
  const purchaseEvents = events.filter((e) => e.event_type === 'purchase');

  const firstTouchSignups = signupEvents.filter((e) => e.is_first_touch).length;
  const lastTouchSignups = signupEvents.length;
  const linearSignups = signupEvents.length;

  const firstTouchRevenue = purchaseEvents
    .filter((e) => e.is_first_touch)
    .reduce((sum, e) => sum + Number(e.value ?? 0), 0);
  const lastTouchRevenue = purchaseEvents.reduce((sum, e) => sum + Number(e.value ?? 0), 0);
  const linearRevenue =
    purchaseEvents.length > 0
      ? purchaseEvents.reduce((sum, e) => sum + Number(e.value ?? 0), 0) / purchaseEvents.length
      : 0;

  const { data: crmData } = await supabaseAdmin
    .from('crm_activity_mirror')
    .select('deal_value, activity_type, account_domain')
    .eq('workspace_id', input.workspaceId)
    .gte('occurred_at', startIso)
    .lte('occurred_at', endIso);

  const crmRows = crmData ?? [];

  const { data: intentDomains } = await supabaseAdmin
    .from('account_intent_scores')
    .select('domain')
    .eq('workspace_id', input.workspaceId);

  const intentDomainSet = new Set(
    (intentDomains ?? []).map((r) => normalizeDomain(String(r.domain))),
  );

  const crmClosedWonValue = crmRows
    .filter((r) => r.activity_type === 'closed_won')
    .reduce((sum, r) => sum + Number(r.deal_value ?? 0), 0);

  const linkedClosedWonRows = crmRows.filter(
    (r) =>
      r.activity_type === 'closed_won' &&
      r.account_domain &&
      intentDomainSet.has(normalizeDomain(String(r.account_domain))),
  );

  const crmLinkedAccounts = new Set(
    linkedClosedWonRows.map((r) => normalizeDomain(String(r.account_domain))),
  ).size;

  const crmLinkedClosedWonValue = linkedClosedWonRows.reduce(
    (sum, r) => sum + Number(r.deal_value ?? 0),
    0,
  );

  const linkedPosts = new Set(events.map((e) => e.content_id).filter(Boolean)).size;

  const channelBreakdown = events.reduce<Record<string, { touches: number; revenue: number }>>((acc, e) => {
    const channel = String(e.channel ?? 'other').toLowerCase();
    if (!acc[channel]) acc[channel] = { touches: 0, revenue: 0 };
    acc[channel].touches += 1;
    if (e.event_type === 'purchase') {
      acc[channel].revenue += Number(e.value ?? 0);
    }
    return acc;
  }, {});

  return {
    firstTouch: {
      signups: firstTouchSignups,
      revenue: firstTouchRevenue,
      touchpoints: events.filter((e) => e.is_first_touch).length,
    },
    lastTouch: {
      signups: lastTouchSignups,
      revenue: lastTouchRevenue,
      touchpoints: events.length,
    },
    linear: {
      signups: linearSignups,
      revenue: linearRevenue,
      touchpoints: events.length,
    },
    crmClosedWonValue,
    crmLinkedAccounts,
    crmLinkedClosedWonValue,
    linkedPosts,
    channelBreakdown,
  };
}

export async function persistAttributionReport(
  input: AttributionCalculationInput & {
    metrics: AttributionMetrics;
    reportType?: AttributionModel | 'nightly_summary' | 'crm_closed_won';
  },
): Promise<SyncToSoRResult> {
  const secret =
    process.env.APPROVAL_HMAC_SECRET ??
    process.env.INTERNAL_TOOL_SECRET ??
    'dev-attribution-signing-key';

  const month = monthStartUtc(input.periodEnd);
  const channels =
    Object.keys(input.metrics.channelBreakdown).length > 0
      ? input.metrics.channelBreakdown
      : {
          linkedin: { touches: input.metrics.lastTouch.touchpoints, revenue: input.metrics.lastTouch.revenue },
        };

  const signature = signReportPayload(secret, {
    workspaceId: input.workspaceId,
    month,
    metrics: input.metrics,
  });

  let lastResult: SyncToSoRResult = { ok: false, error: 'No channels to persist' };

  for (const [channel, stats] of Object.entries(channels)) {
    lastResult = await secureSyncToSoR({
      table: SorTableNames.ATTRIBUTION_REPORTS,
      workspaceId: input.workspaceId,
      userId: input.userId,
      auditAction: 'abm.attribution.report_generated',
      auditMetadata: { channel, reportType: input.reportType ?? 'nightly_summary' },
      data: {
        workspace_id: input.workspaceId,
        month,
        channel,
        touches: Math.round(stats.touches),
        attributed_revenue: Math.round(stats.revenue * 100) / 100,
        report_json: {
          reportType: input.reportType ?? 'nightly_summary',
          periodStart: input.periodStart.toISOString(),
          periodEnd: input.periodEnd.toISOString(),
          metrics: input.metrics,
          signature_hmac: signature,
        },
      },
    });
  }

  return lastResult;
}

export async function runNightlyAttributionCalculation(workspaceId: string, userId: string): Promise<SyncToSoRResult> {
  const periodEnd = new Date();
  const periodStart = new Date(periodEnd);
  periodStart.setUTCDate(periodStart.getUTCDate() - 1);

  const metrics = await calculateAttributionMetrics({ workspaceId, userId, periodStart, periodEnd });
  return persistAttributionReport({
    workspaceId,
    userId,
    periodStart,
    periodEnd,
    metrics,
    reportType: 'nightly_summary',
  });
}

export const attributionCalculationUtils = {
  calculateAttributionMetrics,
  persistAttributionReport,
  runNightlyAttributionCalculation,
  signReportPayload,
};
