import Link from 'next/link';
import { getUserWorkspaceContext } from '@/lib/auth/server-session';
import { createServerComponentClient } from '@/lib/supabase/action';
import { ApprovalDecisionButtons } from './ApprovalDecisionButtons';

export const dynamic = 'force-dynamic';

type ApprovalRow = {
  id: string;
  campaign_id: string | null;
  content_id: string | null;
  severity: string;
  status: string;
  reason: string;
  sla_due_at: string | null;
  created_at: string;
};

export default async function ApprovalInboxPage() {
  const { workspaceId } = await getUserWorkspaceContext();
  const supabase = await createServerComponentClient();

  const { data: approvals } = await supabase
    .from('ai_cmo_approval_requests')
    .select('id, campaign_id, content_id, severity, status, reason, sla_due_at, created_at')
    .eq('workspace_id', workspaceId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(50);

  const rows = (approvals ?? []) as ApprovalRow[];

  return (
    <section className="p-6 md:p-10 min-h-screen bg-gray-50">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Approval Inbox</h1>
          <p className="text-gray-600 mt-1">{rows.length} pending request(s)</p>
        </div>
        <Link href="/ai-ops" className="text-sm text-indigo-600 hover:underline">
          ← AI Ops
        </Link>
      </div>

      <div className="space-y-4">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
            No pending approvals.
          </div>
        ) : (
          rows.map((row) => (
            <article
              key={row.id}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                    {row.severity}
                  </span>
                  <p className="mt-2 font-medium text-gray-900">{row.reason}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    Created {new Date(row.created_at).toLocaleString()}
                    {row.sla_due_at ? ` · SLA ${new Date(row.sla_due_at).toLocaleString()}` : ''}
                  </p>
                </div>
                <ApprovalDecisionButtons approvalId={row.id} />
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
