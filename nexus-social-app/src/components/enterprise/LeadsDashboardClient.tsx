'use client';

import { useEffect, useState } from 'react';

type EnterpriseLead = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  company: string | null;
  source: string;
  status: string;
  created_at: string;
};

function statusBadgeClass(status: string): string {
  if (status === 'new') return 'bg-emerald-100 text-emerald-800';
  if (status === 'contacted') return 'bg-slate-200 text-slate-700';
  if (status === 'qualified') return 'bg-blue-100 text-blue-800';
  if (status === 'closed_won') return 'bg-green-100 text-green-900';
  if (status === 'closed_lost') return 'bg-red-100 text-red-800';
  return 'bg-slate-100 text-slate-700';
}

function sourceBadgeClass(): string {
  return 'bg-blue-50 text-blue-900 ring-1 ring-inset ring-blue-200';
}

function formatName(lead: EnterpriseLead): string {
  return [lead.first_name, lead.last_name].filter(Boolean).join(' ') || '—';
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function LeadsDashboardClient() {
  const [leads, setLeads] = useState<EnterpriseLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/v1/enterprise/leads');
        if (!res.ok) {
          const json = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(json.error ?? `Failed to load leads (${res.status})`);
        }
        const data = (await res.json()) as EnterpriseLead[];
        if (!cancelled) setLeads(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load leads');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Enterprise leads</h1>
        <p className="mt-1 text-sm text-slate-600">
          Inbound leads from the Diligent AI landing page and external webhooks.
        </p>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading leads…</p>}
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Email</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Company</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Source</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No leads yet.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-medium text-slate-900">{formatName(lead)}</td>
                    <td className="px-4 py-3 text-slate-700">{lead.email ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{lead.company ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${sourceBadgeClass()}`}
                      >
                        {lead.source}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(lead.status)}`}
                      >
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(lead.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
