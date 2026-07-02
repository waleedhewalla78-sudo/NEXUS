import Link from 'next/link';
import { checkSystemHealth } from '@/actions/health';
import { getUserWorkspaceContext } from '@/lib/auth/server-session';
import { supabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function StatusBadge({ status }: { status: string }) {
  const color =
    status === 'up' || status === 'healthy'
      ? 'bg-green-100 text-green-800'
      : status === 'unknown'
        ? 'bg-gray-100 text-gray-600'
        : 'bg-red-100 text-red-800';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${color}`}>
      {status}
    </span>
  );
}

export default async function AdminPage() {
  const { userId, workspaceId } = await getUserWorkspaceContext();

  const { data: member } = await supabaseAdmin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single();

  if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
    return (
      <section className="p-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Unauthorized</h1>
        <p className="text-gray-600">Admin access requires owner or admin role.</p>
      </section>
    );
  }

  const health = await checkSystemHealth();

  return (
    <section className="p-6 md:p-10 min-h-screen bg-gray-50 max-w-4xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Console</h1>
      <p className="text-gray-600 mb-8">Platform health and workspace administration.</p>

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        {(
          [
            ['Database', health.db],
            ['Redis', health.redis],
            ['Chatwoot', health.chatwoot],
            ['Dify AI', health.dify],
          ] as const
        ).map(([label, status]) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex items-center justify-between">
            <span className="font-medium text-gray-900">{label}</span>
            <StatusBadge status={status} />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm mb-8">
        <p className="text-sm text-gray-500 mb-1">Overall status</p>
        <StatusBadge status={health.overall} />
        <p className="text-xs text-gray-400 mt-3">
          API: <code className="bg-gray-100 px-1 rounded">GET /api/health</code>
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/settings/team" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">
          Manage team
        </Link>
        <Link href="/settings/ai-agent" className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          AI agent controls
        </Link>
        <Link href="/setup" className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Database setup
        </Link>
      </div>
    </section>
  );
}
