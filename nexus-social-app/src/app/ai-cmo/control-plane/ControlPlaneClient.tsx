'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { ControlPlaneSnapshot } from '@/lib/ai-cmo/agents/control-plane-query';
import { toast } from 'react-hot-toast';
import { Bot, DollarSign, AlertTriangle, CheckCircle2 } from 'lucide-react';

export function ControlPlaneClient() {
  const [snapshot, setSnapshot] = useState<ControlPlaneSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/ai-cmo/agents/control-plane', { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        return res.json() as Promise<ControlPlaneSnapshot>;
      })
      .then(setSnapshot)
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Failed to load control plane'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-gray-500 p-6">Loading agent control plane…</p>;
  }

  if (!snapshot) {
    return <p className="text-gray-500 p-6">Control plane unavailable.</p>;
  }

  return (
    <div className="space-y-8 p-6 md:p-10">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Bot className="h-8 w-8 text-indigo-500" />
          Agent Control Plane
        </h1>
        <p className="text-gray-600 mt-1">
          Eight-agent mesh — spend, failures, and approvals for workspace{' '}
          {snapshot.workspaceId.slice(0, 8)}…
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500 flex items-center gap-1">
            <DollarSign className="h-4 w-4" /> MTD AI cost
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            ${snapshot.totalMtdCostUsd.toFixed(2)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Tokens (MTD)</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {snapshot.totalTokens.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500 flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4" /> Pending approvals
          </p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{snapshot.pendingApprovals}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500 flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" /> Failed jobs
          </p>
          <p className="text-2xl font-bold text-red-600 mt-1">{snapshot.failedJobs}</p>
        </div>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Agent roster</h2>
        </div>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="py-3 px-6">Agent</th>
              <th className="py-3 px-6">Tier</th>
              <th className="py-3 px-6">Implementation</th>
              <th className="py-3 px-6">MTD cost</th>
              <th className="py-3 px-6">Last audit</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.agents.map((agent) => (
              <tr key={agent.id} className="border-b border-gray-100 hover:bg-gray-50/80">
                <td className="py-3 px-6">
                  <p className="font-medium text-gray-900">{agent.displayName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{agent.description}</p>
                </td>
                <td className="py-3 px-6 capitalize">{agent.tier}</td>
                <td className="py-3 px-6 capitalize">{agent.implementation}</td>
                <td className="py-3 px-6">${agent.mtdCostUsd.toFixed(2)}</td>
                <td className="py-3 px-6 text-xs text-gray-500">
                  {agent.lastAuditAction ? (
                    <>
                      <span className="font-mono block">{agent.lastAuditAction}</span>
                      <span>{agent.lastAuditAt?.slice(0, 19).replace('T', ' ')}</span>
                    </>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {snapshot.recentAudit.length > 0 && (
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Recent audit activity</h2>
          <ul className="space-y-2 text-sm">
            {snapshot.recentAudit.map((entry, i) => (
              <li key={`${entry.action}-${i}`} className="flex justify-between text-gray-600">
                <span className="font-mono text-xs">{entry.action}</span>
                <span>{entry.createdAt.slice(0, 19).replace('T', ' ')}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/ai-cmo/abm" className="text-indigo-600 hover:underline">
          ABM accounts →
        </Link>
        <Link href="/ai-ops" className="text-indigo-600 hover:underline">
          AI Ops →
        </Link>
        <Link href="/ai-cmo/approvals" className="text-indigo-600 hover:underline">
          Approvals →
        </Link>
      </div>
    </div>
  );
}
