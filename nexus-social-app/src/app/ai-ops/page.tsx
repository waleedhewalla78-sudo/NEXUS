import Link from 'next/link';
import { getUserWorkspaceContext } from '@/lib/auth/server-session';
import { createServerComponentClient } from '@/lib/supabase/action';

export const dynamic = 'force-dynamic';

type CostSummaryRow = {
  workspace_id: string;
  total_cost_usd: number | null;
  total_tokens: number | null;
  agent_breakdown: Record<string, unknown> | null;
};

export default async function AiOpsPage() {
  const { workspaceId } = await getUserWorkspaceContext();
  const supabase = await createServerComponentClient();

  const [{ data: costSummary }, { count: failedJobsCount }, { count: pendingApprovals }] =
    await Promise.all([
      supabase.from('ai_cmo_cost_summary').select('*').eq('workspace_id', workspaceId).maybeSingle(),
      supabase
        .from('ai_cmo_failed_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId),
      supabase
        .from('ai_cmo_approval_requests')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('status', 'pending'),
    ]);

  const summary = costSummary as CostSummaryRow | null;

  return (
    <section className="p-6 md:p-10 min-h-screen bg-gray-50">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Ops Dashboard</h1>
          <p className="text-gray-600">Live FinOps, failures, and approval queue for workspace {workspaceId.slice(0, 8)}…</p>
        </div>
        <Link href="/copilot" className="text-sm font-medium text-indigo-600 hover:underline">
          Open Copilot →
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total AI Cost (MTD)</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">
            ${Number(summary?.total_cost_usd ?? 0).toFixed(2)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total Tokens</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">
            {Number(summary?.total_tokens ?? 0).toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Failed Jobs</p>
          <p className="text-2xl font-semibold text-red-600 mt-1">{failedJobsCount ?? 0}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Pending Approvals</p>
          <p className="text-2xl font-semibold text-amber-600 mt-1">{pendingApprovals ?? 0}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/ai-cmo/control-plane"
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Agent Control Plane
        </Link>
        <Link
          href="/ai-cmo/abm"
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
        >
          ABM &amp; Attribution
        </Link>
        <Link
          href="/ai-cmo/campaigns/new"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Campaign Brief Wizard
        </Link>
        <Link
          href="/ai-cmo/intelligence"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Campaign Intelligence
        </Link>
        <Link
          href="/ai-cmo/approvals"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Approval Inbox
        </Link>
        <Link
          href="/settings/ai-agent"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          AI Agent Settings
        </Link>
      </div>
    </section>
  );
}
