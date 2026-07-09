/**
 * Feature 006 — re-exports conversational compliance profile (FR-080).
 * Canonical definitions live in mena-v1.ts so ComplianceProfileId stays unified.
 */

export {
  MENA_CONVERSATIONAL_V1_PROFILE_ID,
  MENA_CONVERSATIONAL_V1_RULES,
  MENA_CONVERSATIONAL_CRITICAL_RULES,
  allowsDialectRegister,
  getRulesForProfile,
  isValidComplianceProfileId,
  COMPLIANCE_PROFILE_CATALOG,
  type ComplianceProfileId,
} from '@/lib/governance/compliance-profiles/mena-v1';
