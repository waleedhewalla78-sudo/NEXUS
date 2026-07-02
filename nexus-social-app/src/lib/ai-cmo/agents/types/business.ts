/**
 * Feature 004 Phase 7 — Business agent types (Finance, Compliance).
 */

import { z } from 'zod';
import { agentRunInputSchema } from '@/lib/ai-cmo/agents/types/base';

export const financeRunInputSchema = agentRunInputSchema.extend({
  campaignCostUsd: z.number().nonnegative(),
  revenueAttributedUsd: z.number().nonnegative().default(0),
  budgetCapUsd: z.number().positive().optional(),
  periodDays: z.number().int().positive().default(30),
});

export type FinanceRunInput = z.infer<typeof financeRunInputSchema>;

export const financeProposalSchema = z.object({
  roi: z.number(),
  roas: z.number(),
  spendUtilizationPct: z.number().optional(),
  budgetReallocationHints: z.array(z.string()),
  summary: z.string(),
});

export type FinanceProposal = z.infer<typeof financeProposalSchema>;

export const complianceJurisdictionSchema = z.enum(['uae_pdpl', 'egypt_dpl', 'eu_gdpr', 'generic']);

export type ComplianceJurisdiction = z.infer<typeof complianceJurisdictionSchema>;

export const complianceDataRegionSchema = z.enum(['mena', 'eu', 'generic']);

export type ComplianceDataRegion = z.infer<typeof complianceDataRegionSchema>;

export const complianceRunInputSchema = agentRunInputSchema.extend({
  content: z.object({
    caption: z.string(),
    locale: z.string(),
    callToAction: z.string().optional(),
  }),
  jurisdictions: z.array(complianceJurisdictionSchema).default(['generic']),
  policyRiskTier: z.enum(['LOW', 'MED', 'HIGH', 'CRITICAL']).optional(),
  dataRegion: complianceDataRegionSchema.optional(),
});

export type ComplianceRunInput = z.infer<typeof complianceRunInputSchema>;

export const complianceAdvisorySchema = z.object({
  jurisdictions: z.array(complianceJurisdictionSchema),
  advisories: z.array(
    z.object({
      jurisdiction: complianceJurisdictionSchema,
      ruleId: z.string(),
      severity: z.enum(['info', 'warning', 'critical']),
      message: z.string(),
    }),
  ),
  augmentsPolicyEngine: z.literal(true),
  replacesPolicyEngine: z.literal(false),
  summary: z.string(),
});

export type ComplianceAdvisory = z.infer<typeof complianceAdvisorySchema>;
