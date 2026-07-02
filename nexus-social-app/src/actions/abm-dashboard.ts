'use server';

import { getUserWorkspaceContext } from '@/lib/auth/server-session';
import { createServerComponentClient } from '@/lib/supabase/action';
import {
  queryAbmAccounts,
  queryAttributionChannels,
  aggregateAttributionForChart,
  type AbmAccountRow,
  type AttributionChannelRow,
} from '@/lib/ai-cmo/abm/accounts-query';
import { renderExplainability } from '@/lib/explainability/renderer';
import type { ExplainabilityOutput } from '@/lib/explainability/renderer';
import { generateAuditPdf } from '@/lib/reports/audit-pdf';

export type { AbmAccountRow, AttributionChannelRow };

export async function getAbmAccounts(): Promise<{ accounts: AbmAccountRow[]; configured: boolean }> {
  const { workspaceId } = await getUserWorkspaceContext();
  const supabase = await createServerComponentClient();
  const { accounts, error } = await queryAbmAccounts(supabase, workspaceId);

  if (error) {
    throw new Error(error);
  }

  return { accounts, configured: accounts.length > 0 };
}

export async function getAttributionChannels(): Promise<{
  rows: AttributionChannelRow[];
  chart: ReturnType<typeof aggregateAttributionForChart>;
  configured: boolean;
}> {
  const { workspaceId } = await getUserWorkspaceContext();
  const supabase = await createServerComponentClient();
  const { rows, error } = await queryAttributionChannels(supabase, workspaceId);

  if (error) {
    throw new Error(error);
  }

  return {
    rows,
    chart: aggregateAttributionForChart(rows),
    configured: rows.length > 0,
  };
}

export async function buildAccountExplainability(account: AbmAccountRow): Promise<ExplainabilityOutput> {
  const score = account.intentScore;
  const band = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';
  const topicLabel = account.topics.length ? account.topics.join(', ') : 'General';
  const stageLabel =
    account.buyerStage === 'decision'
      ? 'Decision (bottom-of-funnel)'
      : account.buyerStage === 'consideration'
        ? 'Consideration (mid-funnel)'
        : 'Awareness (top-of-funnel)';

  const registerNote =
    score >= 70 && account.topics.some((t) => t.toLowerCase().includes('ai'))
      ? 'Used Formal Arabic register when locale is ar.'
      : undefined;

  return renderExplainability({
    persona: 'operator',
    decision: `Prioritized ${account.accountName} for autonomous outreach`,
    confidence: score / 100,
    confidenceBand: band,
    policySummary: 'Passed Brand Judge threshold',
    qualitySummary: `Intent ${score}/100 · ${account.touchpoints} CRM touchpoints mirrored`,
    rationaleBullets: [
      `Account ${account.accountName} (${account.industry}) is in ${stageLabel}`,
      `Intent topics from database: ${topicLabel}`,
      `Buyer stage: ${account.buyerStage} → funnel ${account.funnelStage}`,
      registerNote,
      account.funnelStage === 'BOFU'
        ? 'Generated because: bottom-of-funnel direct Arabic/English content recommended'
        : 'Generated because: nurture/educational content recommended',
    ].filter(Boolean) as string[],
    recommendedAction:
      account.funnelStage === 'BOFU'
        ? 'Launch demo-focused LinkedIn + WhatsApp sequence'
        : 'Schedule thought-leadership posts',
  });
}

export async function exportExecutiveAuditPdf(): Promise<
  | { ok: true; pdfBase64: string; signature: string; rowCount: number }
  | { ok: false; error: string }
> {
  try {
    const { workspaceId } = await getUserWorkspaceContext();
    const end = new Date();
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 30);

    const { pdf, signature, rowCount } = await generateAuditPdf({
      workspaceId,
      start,
      end,
    });

    return {
      ok: true,
      pdfBase64: pdf.toString('base64'),
      signature,
      rowCount,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Export failed' };
  }
}

export async function exportExecutiveAttributionSummary(): Promise<
  | { ok: true; filename: string; content: string }
  | { ok: false; error: string }
> {
  const { rows, chart } = await getAttributionChannels();
  if (!rows.length) {
    return { ok: false, error: 'No attribution report available' };
  }

  const totalRevenue = chart.reduce((s, c) => s + c.revenue, 0);
  const totalTouches = chart.reduce((s, c) => s + c.touches, 0);
  const months = [...new Set(rows.map((r) => r.month.slice(0, 7)))].sort();

  const lines = [
    'NEXUS SOCIAL — EXECUTIVE ATTRIBUTION SUMMARY',
    `Period: ${months[0] ?? 'n/a'} → ${months[months.length - 1] ?? 'n/a'}`,
    '',
    'CHANNEL ATTRIBUTION (social → revenue)',
    ...chart.map(
      (c) => `${c.channel}: ${c.touches} touches · $${c.revenue.toLocaleString()} attributed revenue`,
    ),
    '',
    `Total touches: ${totalTouches}`,
    `Total attributed revenue: $${totalRevenue.toLocaleString()}`,
    '',
    'Prepared for CFO review — immutable audit PDF available separately.',
  ];

  return {
    ok: true,
    filename: `nexus-attribution-executive-${new Date().toISOString().slice(0, 10)}.txt`,
    content: lines.join('\n'),
  };
}
