/**
 * Feature 004 Phase 3 — Human approval queue types.
 */

import { z } from 'zod';
import type { RiskTier } from '@/lib/governance/types/policy';

export const approvalStatusSchema = z.enum(['pending', 'approved', 'rejected', 'expired']);
export type ApprovalStatus = z.infer<typeof approvalStatusSchema>;

export const approvalSeveritySchema = z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']);
export type ApprovalSeverity = z.infer<typeof approvalSeveritySchema>;

export type ApprovalRequest = {
  id?: string;
  workspaceId: string;
  campaignId?: string | null;
  contentId?: string | null;
  severity: ApprovalSeverity;
  status: ApprovalStatus;
  reason: string;
  payload?: Record<string, unknown>;
  assigneeUserId?: string | null;
  slaDueAt?: string;
  riskTier?: RiskTier;
};

export type CreateApprovalRequestInput = {
  workspaceId: string;
  userId: string;
  campaignId?: string | null;
  contentId?: string | null;
  severity: ApprovalSeverity;
  reason: string;
  payload?: Record<string, unknown>;
  assigneeUserId?: string | null;
  slaHours?: number;
  riskTier?: RiskTier;
};

export interface IApprovalService {
  createApprovalRequest(input: CreateApprovalRequestInput): Promise<{ ok: true; id: string } | { ok: false; error: string }>;
  decideApprovalRequest(input: {
    workspaceId: string;
    userId: string;
    approvalId: string;
    status: 'approved' | 'rejected';
  }): Promise<{ ok: true; id: string } | { ok: false; error: string }>;
}

export function riskTierToApprovalSeverity(tier: RiskTier): ApprovalSeverity {
  switch (tier) {
    case 'CRITICAL':
      return 'CRITICAL';
    case 'HIGH':
      return 'HIGH';
    case 'MED':
      return 'MEDIUM';
    default:
      return 'LOW';
  }
}

export function defaultSlaHoursForSeverity(severity: ApprovalSeverity): number {
  switch (severity) {
    case 'CRITICAL':
      return 4;
    case 'HIGH':
      return 24;
    case 'MEDIUM':
      return 72;
    default:
      return 168;
  }
}
