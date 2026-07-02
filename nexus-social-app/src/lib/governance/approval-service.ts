/**
 * Feature 004 Phase 3 — Human approval queue (SoR via secure reconciler).
 */

import { SorTableNames } from '@/lib/ai-cmo/types/reconciler';
import { securePatchSoR, secureSyncToSoR } from '@/lib/ai-cmo/utils/secure-reconciler-writer';
import type { CreateApprovalRequestInput, IApprovalService } from '@/lib/governance/types/approval';
import { defaultSlaHoursForSeverity as slaHoursForSeverity } from '@/lib/governance/types/approval';

export class ApprovalService implements IApprovalService {
  async createApprovalRequest(input: CreateApprovalRequestInput) {
    const slaDueAt = new Date(
      Date.now() + (input.slaHours ?? slaHoursForSeverity(input.severity)) * 60 * 60 * 1000,
    ).toISOString();

    const result = await secureSyncToSoR({
      table: SorTableNames.AI_CMO_APPROVAL_REQUESTS,
      workspaceId: input.workspaceId,
      userId: input.userId,
      auditAction: 'ai_cmo.approval.created',
      auditMetadata: {
        severity: input.severity,
        campaignId: input.campaignId,
        riskTier: input.riskTier,
      },
      data: {
        workspace_id: input.workspaceId,
        campaign_id: input.campaignId ?? null,
        content_id: input.contentId ?? null,
        severity: input.severity,
        status: 'pending',
        reason: input.reason,
        payload: {
          ...(input.payload ?? {}),
          riskTier: input.riskTier,
        },
        assignee_user_id: input.assigneeUserId ?? null,
        sla_due_at: slaDueAt,
      },
    });

    if (!result.ok) {
      return { ok: false as const, error: result.error };
    }

    return { ok: true as const, id: result.id };
  }

  async decideApprovalRequest(input: {
    workspaceId: string;
    userId: string;
    approvalId: string;
    status: 'approved' | 'rejected';
  }) {
    const result = await securePatchSoR({
      table: SorTableNames.AI_CMO_APPROVAL_REQUESTS,
      id: input.approvalId,
      workspaceId: input.workspaceId,
      userId: input.userId,
      auditAction: `ai_cmo.approval.${input.status}`,
      patch: {
        status: input.status,
        decided_at: new Date().toISOString(),
        decided_by: input.userId,
      },
    });

    if (!result.ok) {
      return { ok: false as const, error: result.error };
    }

    return { ok: true as const, id: result.id };
  }
}

export const approvalService = new ApprovalService();

export const approvalServiceUtils = {
  ApprovalService,
  approvalService,
};
