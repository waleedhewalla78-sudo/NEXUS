/**
 * MENA Compliance Pack v1 — productized rule catalog (FR-067–FR-069).
 * Toggle via workspace branding.compliance_profile = 'mena_v1'.
 */

import type { StructuredPolicyRule } from '@/lib/governance/types/policy';

export const MENA_V1_PROFILE_ID = 'mena_v1' as const;
export const GLOBAL_DEFAULT_PROFILE_ID = 'global_default' as const;

export type ComplianceProfileId = typeof MENA_V1_PROFILE_ID | typeof GLOBAL_DEFAULT_PROFILE_ID;

export type ComplianceProfileMeta = {
  id: ComplianceProfileId;
  label: string;
  description: string;
  jurisdictions: string[];
  arabicRegister: 'msa' | 'dialect_allowed' | 'en_only';
};

export const COMPLIANCE_PROFILE_CATALOG: Record<ComplianceProfileId, ComplianceProfileMeta> = {
  global_default: {
    id: 'global_default',
    label: 'Global default',
    description: 'Standard PolicyEngine V2 rules without regional pack',
    jurisdictions: ['generic'],
    arabicRegister: 'dialect_allowed',
  },
  mena_v1: {
    id: 'mena_v1',
    label: 'MENA v1 (PDPL / Egypt DPL)',
    description: 'UAE PDPL, Egypt DPL, MSA Arabic register enforcement',
    jurisdictions: ['uae_pdpl', 'egypt_dpl'],
    arabicRegister: 'msa',
  },
};

export const MENA_V1_RULES: StructuredPolicyRule[] = [
  {
    id: 'mena-v1-pdpl-consent',
    name: 'MENA v1 — PDPL explicit consent',
    condition: (c) =>
      /personal data|phone number|email address|data subject|profiling/i.test(c.text),
    action: 'require_approval',
    severity: 'high',
    reason: 'MENA PDPL requires explicit consent language for personal data processing',
  },
  {
    id: 'mena-v1-pdpl-cross-border',
    name: 'MENA v1 — Cross-border transfer',
    condition: (c) => /cross-border|cross border|data transfer|offshore/i.test(c.text),
    action: 'require_approval',
    severity: 'critical',
    reason: 'Cross-border data transfer requires PDPL adequacy assessment',
  },
  {
    id: 'mena-v1-egypt-dpl-regulated',
    name: 'MENA v1 — Egypt DPL regulated claims',
    condition: (c) =>
      c.industry === 'financial' ||
      /banking|loan|credit|medical|health claim|investment return/i.test(c.text),
    action: 'require_approval',
    severity: 'critical',
    reason: 'Regulated sector claims require legal review under Egypt DPL context',
  },
  {
    id: 'mena-v1-arabic-msa',
    name: 'MENA v1 — Modern Standard Arabic register',
    condition: (c) => {
      if (!c.locale.startsWith('ar')) return false;
      return /slang|dialect|عامية|مصري|خليجي/i.test(c.text);
    },
    action: 'require_approval',
    severity: 'high',
    reason: 'MENA profile requires Modern Standard Arabic (MSA) for formal brand communications',
  },
  {
    id: 'mena-v1-geo-restriction',
    name: 'MENA v1 — Geo-targeted offer',
    condition: (c) => /only in uae|egypt residents|gcc only|geo-restricted/i.test(c.text),
    action: 'require_approval',
    severity: 'medium',
    reason: 'Geo-restricted offers must match tenant data_region and local advertising rules',
  },
];

export function getRulesForProfile(profileId: ComplianceProfileId): StructuredPolicyRule[] {
  if (profileId === MENA_V1_PROFILE_ID) return MENA_V1_RULES;
  return [];
}

export function isValidComplianceProfileId(value: unknown): value is ComplianceProfileId {
  return value === MENA_V1_PROFILE_ID || value === GLOBAL_DEFAULT_PROFILE_ID;
}
