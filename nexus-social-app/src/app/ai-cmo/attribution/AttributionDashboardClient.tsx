'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AttributionChannelRow } from '@/lib/ai-cmo/abm/accounts-query';
import { toast } from 'react-hot-toast';
import { GitBranch, TrendingUp } from 'lucide-react';

type AttributionApiResponse = {
  rows: AttributionChannelRow[];
  chart: { channel: string; touches: number; revenue: number }[];
  configured: boolean;
};

export function AttributionDashboardClient() {
  const [rows, setRows] = useState<AttributionChannelRow[]>([]);
  const [chartData, setChartData] = useState<AttributionApiResponse['chart']>([]);
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/ai-cmo/abm/attribution', { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        return res.json() as Promise<AttributionApiResponse>;
      })
      .then(({ rows: dataRows, chart, configured: isConfigured }) => {
        setRows(dataRows);
        setChartData(chart);
        setConfigured(isConfigured);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Failed to load attribution'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-gray-500">Loading attribution data…</p>;
  }

  if (!configured) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
        <GitBranch className="mx-auto h-10 w-10 text-gray-400" />
        <h2 className="mt-4 text-lg font-semibold text-gray-900">No attribution data configured</h2>
        <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
          Run <code className="rounded bg-gray-100 px-1">npm run seed:abm-demo</code> after applying the
          enterprise ABM migration to populate channel attribution rows.
        </p>
        <p className="mt-4 text-sm text-gray-500">
          <Link href="/ai-cmo/abm" className="text-indigo-600 hover:underline">
            ← Back to ABM account list
          </Link>
        </p>
      </div>
    );
  }

  const totalRevenue = chartData.reduce((s, c) => s + c.revenue, 0);
  const totalTouches = chartData.reduce((s, c) => s + c.touches, 0);
  const topChannel = chartData.reduce(
    (best, c) => (c.revenue > (best?.revenue ?? 0) ? c : best),
    chartData[0],
  );

  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        Live data from <code className="rounded bg-emerald-100 px-1">attribution_reports</code> (RLS-protected)
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total attributed revenue</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">${totalRevenue.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Social touches (3 mo)</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalTouches}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Top converting channel</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1 capitalize">{topChannel?.channel ?? '—'}</p>
        </div>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <GitBranch className="h-5 w-5 text-violet-500" />
          Social channel → revenue attribution
        </h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="channel" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="touches" name="Touches" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="revenue" name="Revenue ($)" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Connects Nexus AI-generated LinkedIn posts, WhatsApp replies, and campaigns to CRM pipeline value
          via <code>attribution_reports</code> + <code>crm_activity_mirror</code>.
        </p>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-3">
          <TrendingUp className="h-5 w-5 text-indigo-500" />
          Monthly channel breakdown
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="py-2 pr-4">Month</th>
                <th className="py-2 pr-4">Channel</th>
                <th className="py-2 pr-4">Touches</th>
                <th className="py-2">Attributed revenue</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-gray-100">
                  <td className="py-2 pr-4">{row.month.slice(0, 7)}</td>
                  <td className="py-2 pr-4 font-medium capitalize">{row.channel}</td>
                  <td className="py-2 pr-4">{row.touches}</td>
                  <td className="py-2">${row.attributedRevenue.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-sm text-gray-500">
        <Link href="/ai-cmo/abm" className="text-indigo-600 hover:underline">
          ← Back to ABM account list
        </Link>
      </p>
    </div>
  );
}
