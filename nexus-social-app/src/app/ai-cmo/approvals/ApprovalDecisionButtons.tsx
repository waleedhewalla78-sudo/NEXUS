'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { decideApprovalFromSession } from '@/actions/approval-decision';

export function ApprovalDecisionButtons({ approvalId }: { approvalId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<'approved' | 'rejected' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: 'approved' | 'rejected') {
    setLoading(decision);
    setError(null);
    try {
      const result = await decideApprovalFromSession(approvalId, decision);
      if (!result.ok) {
        throw new Error(result.error ?? 'Decision failed');
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Decision failed');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={loading !== null}
          onClick={() => void decide('approved')}
          className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-50"
        >
          {loading === 'approved' ? '…' : 'Approve'}
        </button>
        <button
          type="button"
          disabled={loading !== null}
          onClick={() => void decide('rejected')}
          className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          {loading === 'rejected' ? '…' : 'Reject'}
        </button>
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
