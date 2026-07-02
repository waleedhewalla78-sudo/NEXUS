'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  buildAccountExplainability,
  exportExecutiveAuditPdf,
  exportExecutiveAttributionSummary,
  type AbmAccountRow,
} from '@/actions/abm-dashboard';
import { activateAbmAccount } from '@/actions/abm-activate';
import { IntentScoreBadge, funnelStageBadge } from '@/components/ai-cmo/IntentScoreBadge';
import { ExplainabilitySidePanel } from '@/components/ai-cmo/ExplainabilitySidePanel';
import type { ExplainabilityOutput } from '@/lib/explainability/renderer';
import { toast } from 'react-hot-toast';
import { Building2, Download, FileText, Target, Zap } from 'lucide-react';

type AccountsApiResponse = {
  accounts: AbmAccountRow[];
  configured: boolean;
  source?: string;
};

export function AbmDashboardClient() {
  const [accounts, setAccounts] = useState<AbmAccountRow[]>([]);
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [explainMap, setExplainMap] = useState<Record<string, ExplainabilityOutput>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'audit' | 'attribution' | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/ai-cmo/abm/accounts', { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        return res.json() as Promise<AccountsApiResponse>;
      })
      .then(async ({ accounts: rows, configured: isConfigured }) => {
        setAccounts(rows);
        setConfigured(isConfigured);
        if (rows.length === 0) return;
        const entries = await Promise.all(
          rows.map(async (a) => [a.id, await buildAccountExplainability(a)] as const),
        );
        setExplainMap(Object.fromEntries(entries));
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Failed to load accounts'))
      .finally(() => setLoading(false));
  }, []);

  async function handleActivate(account: AbmAccountRow) {
    setActivatingId(account.id);
    const result = await activateAbmAccount(account.id);
    setActivatingId(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Playbook queued — job ${result.jobId.slice(0, 8)}…`);
  }

  async function handleAuditExport() {
    setExporting('audit');
    const result = await exportExecutiveAuditPdf();
    setExporting(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const bytes = Uint8Array.from(atob(result.pdfBase64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus-audit-executive-${new Date().toISOString().slice(0, 10)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Audit PDF exported (${result.rowCount} entries, signed)`);
  }

  async function handleAttributionExport() {
    setExporting('attribution');
    const result = await exportExecutiveAttributionSummary();
    setExporting(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const blob = new Blob([result.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Executive attribution summary downloaded');
  }

  if (loading) {
    return <p className="text-gray-500">Loading target accounts…</p>;
  }

  if (!configured) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
        <Target className="mx-auto h-10 w-10 text-gray-400" />
        <h2 className="mt-4 text-lg font-semibold text-gray-900">No accounts configured</h2>
        <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
          Run{' '}
          <code className="rounded bg-gray-100 px-1">supabase/migrations/20260630_enterprise_abm_tables.sql</code>{' '}
          in Supabase, then{' '}
          <code className="rounded bg-gray-100 px-1">npm run seed:abm-demo</code> to populate enterprise ABM
          accounts.
        </p>
      </div>
    );
  }

  const highIntent = accounts.filter((a) => a.intentScore >= 70).length;
  const totalTouchpoints = accounts.reduce((s, a) => s + a.touchpoints, 0);

  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        Live data from <code className="rounded bg-emerald-100 px-1">account_intent_scores</code> (RLS-protected)
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500 flex items-center gap-1">
            <Target className="h-4 w-4" /> Target accounts
          </p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{accounts.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">High intent (≥70)</p>
          <p className="text-3xl font-bold text-rose-600 mt-1">{highIntent}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">CRM touchpoints</p>
          <p className="text-3xl font-bold text-indigo-600 mt-1">{totalTouchpoints}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Avg intent score</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {accounts.length
              ? Math.round(accounts.reduce((s, a) => s + a.intentScore, 0) / accounts.length)
              : 0}
          </p>
        </div>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-indigo-500" />
            Account list (ABM view)
          </h2>
          <Link href="/ai-cmo/attribution" className="text-sm text-indigo-600 hover:underline">
            Multi-touch attribution →
          </Link>
        </div>
        <ul className="divide-y divide-gray-100">
          {accounts.map((account) => {
            const topicLabel = account.topics.join(', ');
            return (
              <li key={account.id} className="px-6 py-4 hover:bg-gray-50/80">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-gray-900">{account.accountName}</p>
                      <IntentScoreBadge score={account.intentScore} topic={topicLabel} />
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${funnelStageBadge(account.funnelStage)}`}
                      >
                        {account.funnelStage}
                      </span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 capitalize">
                        {account.buyerStage}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{account.domain}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Industry: {account.industry} · Topics:{' '}
                      <span className="font-medium">{topicLabel}</span> ·{' '}
                      {account.touchpoints} CRM touchpoint{account.touchpoints !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={activatingId === account.id}
                      onClick={() => handleActivate(account)}
                      className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-50"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      {activatingId === account.id ? 'Activating…' : 'Activate playbook'}
                    </button>
                    {explainMap[account.id] && (
                      <ExplainabilitySidePanel
                        output={explainMap[account.id]}
                        compact
                        className={expandedId === account.id ? 'hidden' : ''}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => setExpandedId(expandedId === account.id ? null : account.id)}
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      {expandedId === account.id ? 'Hide' : 'Why?'}
                    </button>
                  </div>
                </div>
                {expandedId === account.id && explainMap[account.id] && (
                  <div className="mt-3">
                    <ExplainabilitySidePanel output={explainMap[account.id]} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-xl border border-gray-200 bg-gradient-to-br from-slate-800 to-indigo-900 p-6 text-white shadow-lg">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Executive exports (CFO-ready)
        </h2>
        <p className="text-indigo-100 text-sm mt-1 max-w-2xl">
          Immutable signed audit PDF plus attribution summary for board review and contract renewal.
        </p>
        <div className="flex flex-wrap gap-3 mt-4">
          <button
            type="button"
            disabled={exporting !== null}
            onClick={handleAuditExport}
            className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-indigo-900 hover:bg-indigo-50 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {exporting === 'audit' ? 'Generating…' : 'Download signed audit PDF'}
          </button>
          <button
            type="button"
            disabled={exporting !== null}
            onClick={handleAttributionExport}
            className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-4 py-2 text-sm font-medium hover:bg-white/10 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {exporting === 'attribution' ? 'Preparing…' : 'Download attribution summary'}
          </button>
        </div>
      </section>
    </div>
  );
}
