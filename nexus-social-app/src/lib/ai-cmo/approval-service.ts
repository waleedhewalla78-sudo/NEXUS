/**
 * Human approval queue — re-exports governance service for backward compatibility.
 */

export {
  approvalService,
  approvalServiceUtils,
  ApprovalService,
} from '@/lib/governance/approval-service';

export type {
  ApprovalRequest,
  ApprovalStatus,
  ApprovalSeverity,
  CreateApprovalRequestInput,
  IApprovalService,
} from '@/lib/governance/types/approval';

export { riskTierToApprovalSeverity, defaultSlaHoursForSeverity } from '@/lib/governance/types/approval';

import { approvalService } from '@/lib/governance/approval-service';
import type { CreateApprovalRequestInput } from '@/lib/governance/types/approval';
import type { SyncToSoRResult } from '@/lib/ai-cmo/types/reconciler';

export async function createApprovalRequestViaReconciler(
  input: CreateApprovalRequestInput,
): Promise<SyncToSoRResult> {
  const result = await approvalService.createApprovalRequest(input);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true, id: result.id };
}

export async function decideApprovalRequestViaReconciler(input: {
  workspaceId: string;
  userId: string;
  approvalId: string;
  status: 'approved' | 'rejected';
}): Promise<SyncToSoRResult> {
  const result = await approvalService.decideApprovalRequest(input);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true, id: result.id };
}
