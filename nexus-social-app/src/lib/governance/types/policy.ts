/**
 * Feature 004 Phase 3 — Structured policy types (risk-tier routing).
 */

import { z } from 'zod';

export const riskTierSchema = z.enum(['LOW', 'MED', 'HIGH', 'CRITICAL']);
export type RiskTier = z.infer<typeof riskTierSchema>;

export const structuredContentPieceSchema = z.object({
  text: z.string(),
  locale: z.string(),
  industry: z.string().optional(),
  mentionsCompetitor: z.boolean(),
  containsPricingData: z.boolean(),
  containsLegalLanguage: z.boolean(),
  containsComplianceTerms: z.boolean(),
  targetsGovernmentSegment: z.boolean(),
  containsReligiousOrPoliticalContent: z.boolean(),
  /** Auxiliary only — MUST NOT determine approval routing (Constitution VI). */
  confidence: z.number().min(0).max(1).optional(),
});

export type StructuredContentPiece = z.infer<typeof structuredContentPieceSchema>;

export type PolicyAction = 'block' | 'require_approval' | 'flag' | 'allow';
export type PolicySeverity = 'critical' | 'high' | 'medium' | 'low';

export type PolicyViolation = {
  id: string;
  name: string;
  action: PolicyAction;
  severity: PolicySeverity;
  reason: string;
};

export type PolicyResult = {
  approved: boolean;
  riskTier: RiskTier;
  reason: string;
  violations: PolicyViolation[];
  requiresApproval: boolean;
  /** Advisory only — channel-risk heatmap hints; does not override riskTier routing. */
  advisories?: string[];
};

export type StructuredPolicyRule = {
  id: string;
  name: string;
  condition: (content: StructuredContentPiece) => boolean;
  action: PolicyAction;
  severity: PolicySeverity;
  reason: string;
};
