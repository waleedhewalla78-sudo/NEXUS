import type { PaidMediaImportReport } from '@/lib/analytics/paid-media/import-report';
import { sendAiCmoInngestEvent } from '@/lib/orchestration/inngest-client';
import { AI_CMO_INNGEST_EVENT_NAMES } from '@/lib/orchestration/types/events';

/** Map paid-media import KPIs to Quant consumer via ANALYTICS_SYNCED (read-only ingest). */
export async function emitPaidMediaQuantHints(
  workspaceId: string,
  report: PaidMediaImportReport,
): Promise<void> {
  const kpis = report.accountKpis;
  const scaleCount = report.entities.filter((e) => e.status === 'Scale').length;
  const pauseCount = report.entities.filter((e) => e.status === 'Pause').length;

  await sendAiCmoInngestEvent({
    name: AI_CMO_INNGEST_EVENT_NAMES.ANALYTICS_SYNCED,
    data: {
      workspaceId,
      syncedAt: new Date().toISOString(),
      metrics: {
        impressions: kpis.impressions ?? 0,
        clicks: kpis.clicks ?? 0,
        conversions: kpis.conversions ?? 0,
        spend: kpis.spend ?? 0,
        roas: kpis.roas ?? null,
        cpa: kpis.cpa ?? null,
        ctr: kpis.ctr ?? null,
        platform: report.platform,
        scale_entities: scaleCount,
        pause_entities: pauseCount,
        import_row_count: report.rowCount,
        brain_hints: report.recommendations.slice(0, 8),
      },
    },
  });
}
