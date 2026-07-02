'use client';

import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { importPaidMediaFromSession } from '@/actions/analytics-import-ui';
import { exportCampaignCalendarHtml } from '@/actions/campaign-calendar-export';
import type { ScoredEntity } from '@/lib/analytics/paid-media/entity-scorer';

type ImportReport = {
  workspaceId: string;
  platform: string;
  rowCount: number;
  accountKpis: {
    spend?: number | null;
    roas?: number | null;
    cpa?: number | null;
    ctr?: number | null;
    impressions?: number | null;
    clicks?: number | null;
  };
  entities: ScoredEntity[];
  anomalies: string[];
  recommendations: string[];
};

const STATUS_COLORS: Record<string, string> = {
  Scale: '#16a34a',
  Optimize: '#2563eb',
  'Test More': '#d97706',
  Pause: '#dc2626',
};

export function IntelligenceDashboardClient() {
  const [report, setReport] = useState<ImportReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'overview' | 'entities' | 'recommendations'>('overview');
  const [exporting, setExporting] = useState(false);

  async function handleImport(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const result = await importPaidMediaFromSession(formData);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      setReport(null);
      return;
    }
    setReport(result.report as ImportReport);
    setTab('overview');
  }

  async function handleCalendarExport() {
    setExporting(true);
    const result = await exportCampaignCalendarHtml();
    setExporting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const blob = new Blob([result.html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const statusPie = report
    ? Object.entries(
        report.entities.reduce<Record<string, number>>((acc, e) => {
          acc[e.status] = (acc[e.status] ?? 0) + 1;
          return acc;
        }, {}),
      ).map(([name, value]) => ({ name, value }))
    : [];

  const topEntities = report?.entities.slice(0, 12) ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleCalendarExport}
          disabled={exporting}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {exporting ? 'Exporting…' : 'Download 30-day calendar HTML'}
        </button>
      </div>

      <form onSubmit={handleImport} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4 max-w-xl">
        <h2 className="font-semibold text-gray-900">Paid media CSV import</h2>
        <input name="file" type="file" accept=".csv,text/csv" required className="text-sm" />
        <label className="block text-sm">
          Breakdown
          <select name="breakdown" className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="campaign">Campaign</option>
            <option value="adset">Ad set</option>
            <option value="ad">Ad</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {loading ? 'Analyzing…' : 'Upload & score'}
        </button>
      </form>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      {report && (
        <>
          <div className="flex gap-2 border-b border-gray-200">
            {(['overview', 'entities', 'recommendations'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-medium capitalize ${tab === t ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === 'overview' && (
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <h3 className="font-semibold mb-4">Account KPIs ({report.platform})</h3>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div><dt className="text-gray-500">Rows</dt><dd className="font-semibold">{report.rowCount}</dd></div>
                  <div><dt className="text-gray-500">Spend</dt><dd className="font-semibold">${report.accountKpis.spend?.toFixed(2) ?? '—'}</dd></div>
                  <div><dt className="text-gray-500">ROAS</dt><dd className="font-semibold">{report.accountKpis.roas?.toFixed(2) ?? '—'}</dd></div>
                  <div><dt className="text-gray-500">CPA</dt><dd className="font-semibold">{report.accountKpis.cpa?.toFixed(2) ?? '—'}</dd></div>
                  <div><dt className="text-gray-500">CTR</dt><dd className="font-semibold">{report.accountKpis.ctr != null ? `${(report.accountKpis.ctr * 100).toFixed(2)}%` : '—'}</dd></div>
                  <div><dt className="text-gray-500">Clicks</dt><dd className="font-semibold">{report.accountKpis.clicks ?? '—'}</dd></div>
                </dl>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-5 h-72">
                <h3 className="font-semibold mb-2">Entity status mix</h3>
                <ResponsiveContainer width="100%" height="90%">
                  <PieChart>
                    <Pie data={statusPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {statusPie.map((entry) => (
                        <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {report.anomalies.length > 0 && (
                <div className="lg:col-span-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
                  <strong>Anomalies:</strong>
                  <ul className="list-disc ml-5 mt-1">{report.anomalies.map((a) => <li key={a}>{a}</li>)}</ul>
                </div>
              )}
            </div>
          )}

          {tab === 'entities' && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topEntities} layout="vertical" margin={{ left: 120 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="score" fill="#6366f1" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {tab === 'recommendations' && (
            <ul className="rounded-xl border border-gray-200 bg-white p-5 space-y-2 text-sm list-disc ml-5">
              {report.recommendations.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}

          <p className="text-xs text-gray-400">
            Import triggers Quant hints via Inngest <code>analytics.synced</code> (read-only).
          </p>
        </>
      )}

      {!report && !loading && (
        <p className="text-sm text-gray-500">
          Upload a Meta or Google Ads CSV export to see scored entities and reallocation hints.
        </p>
      )}
    </div>
  );
}
