import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  enforceRLS,
  SorTableNames,
  syncToSoR,
  validateWrite,
} from '@/lib/sync/reconciler';

vi.mock('@/lib/oauth/auth-guard', () => ({
  verifyWorkspaceMembership: vi.fn(),
}));

vi.mock('@/lib/audit', () => ({
  auditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

import { verifyWorkspaceMembership } from '@/lib/oauth/auth-guard';
import { auditLog } from '@/lib/audit';
import { supabaseAdmin } from '@/lib/supabase/server';

const workspaceId = '550e8400-e29b-41d4-a716-446655440000';
const userId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

describe('reconciler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateWrite', () => {
    it('accepts valid campaign payload', () => {
      const result = validateWrite(SorTableNames.AI_CMO_CAMPAIGNS, {
        workspace_id: workspaceId,
        name: 'Q3 Launch',
        status: 'draft',
      });
      expect(result.ok).toBe(true);
    });

    it('rejects missing workspace_id', () => {
      const result = validateWrite(SorTableNames.AI_CMO_CAMPAIGNS, {
        name: 'Q3 Launch',
      });
      expect(result.ok).toBe(false);
    });

    it('rejects invalid learning_type', () => {
      const result = validateWrite(SorTableNames.AI_CMO_LEARNINGS, {
        workspace_id: workspaceId,
        learning_type: 'invalid',
      });
      expect(result.ok).toBe(false);
    });
  });

  describe('enforceRLS', () => {
    it('delegates to workspace membership check', async () => {
      vi.mocked(verifyWorkspaceMembership).mockResolvedValue(undefined);
      await enforceRLS({ workspaceId, userId });
      expect(verifyWorkspaceMembership).toHaveBeenCalledWith({ workspaceId, userId });
    });

    it('propagates unauthorized errors', async () => {
      vi.mocked(verifyWorkspaceMembership).mockRejectedValue(new Error('Unauthorized'));
      await expect(enforceRLS({ workspaceId, userId })).rejects.toThrow('Unauthorized');
    });
  });

  describe('syncToSoR', () => {
    it('writes, audits, and returns id on success', async () => {
      vi.mocked(verifyWorkspaceMembership).mockResolvedValue(undefined);

      const insert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: '33333333-3333-3333-3333-333333333333' },
            error: null,
          }),
        }),
      });
      vi.mocked(supabaseAdmin.from).mockReturnValue({ insert } as never);

      const result = await syncToSoR({
        table: SorTableNames.AI_CMO_LEARNINGS,
        workspaceId,
        userId,
        auditAction: 'ai_cmo.learning.created',
        data: {
          workspace_id: workspaceId,
          learning_type: 'timing',
          context: { channel: 'linkedin' },
        },
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.id).toBe('33333333-3333-3333-3333-333333333333');
      }
      expect(auditLog).toHaveBeenCalledWith(
        workspaceId,
        userId,
        'ai_cmo.learning.created',
        expect.objectContaining({ table: SorTableNames.AI_CMO_LEARNINGS }),
      );
    });

    it('skips write when validation fails', async () => {
      const result = await syncToSoR({
        table: SorTableNames.AI_CMO_COST_LEDGER,
        workspaceId,
        userId,
        auditAction: 'ai_cmo.cost.recorded',
        data: { workspace_id: workspaceId, agent_name: 'brain' },
      });

      expect(result.ok).toBe(false);
      expect(supabaseAdmin.from).not.toHaveBeenCalled();
      expect(auditLog).not.toHaveBeenCalled();
    });

    it('does not audit when insert fails', async () => {
      vi.mocked(verifyWorkspaceMembership).mockResolvedValue(undefined);

      const insert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'insert failed' },
          }),
        }),
      });
      vi.mocked(supabaseAdmin.from).mockReturnValue({ insert } as never);

      const result = await syncToSoR({
        table: SorTableNames.AI_CMO_ATTRIBUTION_EVENTS,
        workspaceId,
        userId,
        auditAction: 'ai_cmo.attribution.recorded',
        data: {
          workspace_id: workspaceId,
          visitor_id: 'visitor-1',
          event_type: 'signup',
        },
      });

      expect(result.ok).toBe(false);
      expect(auditLog).not.toHaveBeenCalled();
    });

    it('completes validate→RLS→write path under 100ms (unit benchmark)', async () => {
      vi.mocked(verifyWorkspaceMembership).mockResolvedValue(undefined);

      const insert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: '44444444-4444-4444-4444-444444444444' },
            error: null,
          }),
        }),
      });
      vi.mocked(supabaseAdmin.from).mockReturnValue({ insert } as never);

      const start = performance.now();
      await syncToSoR({
        table: SorTableNames.AI_CMO_EVALUATIONS,
        workspaceId,
        userId,
        auditAction: 'ai_cmo.evaluation.created',
        data: {
          workspace_id: workspaceId,
          content_id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
          evaluator_type: 'automated',
        },
      });
      expect(performance.now() - start).toBeLessThan(100);
    });
  });
});
