import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  createApprovalRequestViaReconciler,
  decideApprovalRequestViaReconciler,
} from '@/lib/ai-cmo/approval-service';

vi.mock('@/lib/ai-cmo/utils/secure-reconciler-writer', () => ({
  secureSyncToSoR: vi.fn(),
  securePatchSoR: vi.fn(),
}));

import { secureSyncToSoR, securePatchSoR } from '@/lib/ai-cmo/utils/secure-reconciler-writer';

const workspaceId = '550e8400-e29b-41d4-a716-446655440000';
const userId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

describe('approval service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates approval request with CRITICAL SLA', async () => {
    vi.mocked(secureSyncToSoR).mockResolvedValue({ ok: true, id: 'appr-1' });

    const result = await createApprovalRequestViaReconciler({
      workspaceId,
      userId,
      campaignId: 'camp-1',
      severity: 'CRITICAL',
      reason: 'Policy violation',
    });

    expect(result.ok).toBe(true);
    expect(secureSyncToSoR).toHaveBeenCalledWith(
      expect.objectContaining({
        table: 'ai_cmo_approval_requests',
        data: expect.objectContaining({ severity: 'CRITICAL', status: 'pending' }),
      }),
    );
  });

  it('decides approval via patchSoR', async () => {
    vi.mocked(securePatchSoR).mockResolvedValue({ ok: true, id: 'appr-1' });

    const result = await decideApprovalRequestViaReconciler({
      workspaceId,
      userId,
      approvalId: 'appr-1',
      status: 'approved',
    });

    expect(result.ok).toBe(true);
    expect(securePatchSoR).toHaveBeenCalledWith(
      expect.objectContaining({
        patch: expect.objectContaining({ status: 'approved' }),
      }),
    );
  });
});
