import { describe, expect, it } from 'vitest';
import {
  MENA_CONVERSATIONAL_V1_PROFILE_ID,
  MENA_V1_PROFILE_ID,
  allowsDialectRegister,
  getRulesForProfile,
  isValidComplianceProfileId,
} from '@/lib/governance/compliance-profiles/mena-v1';

describe('mena_conversational_v1 (FR-080)', () => {
  it('is a valid profile id and allows dialect register', () => {
    expect(isValidComplianceProfileId(MENA_CONVERSATIONAL_V1_PROFILE_ID)).toBe(true);
    expect(allowsDialectRegister(MENA_CONVERSATIONAL_V1_PROFILE_ID)).toBe(true);
    expect(allowsDialectRegister(MENA_V1_PROFILE_ID)).toBe(false);
  });

  it('keeps CRITICAL PDPL rules and does not include MSA slang block', () => {
    const rules = getRulesForProfile(MENA_CONVERSATIONAL_V1_PROFILE_ID);
    const ids = rules.map((r) => r.id);
    expect(ids).toContain('mena-v1-pdpl-consent');
    expect(ids).toContain('mena-v1-pdpl-cross-border');
    expect(ids).toContain('mena-v1-egypt-dpl-regulated');
    expect(ids).not.toContain('mena-v1-arabic-msa');
    expect(ids).toContain('mena-conv-v1-escalation-anger');
  });

  it('blocks guaranteed-return claims in financial context', () => {
    const rule = getRulesForProfile(MENA_CONVERSATIONAL_V1_PROFILE_ID).find(
      (r) => r.id === 'mena-conv-v1-no-guaranteed-returns',
    );
    expect(rule).toBeDefined();
    expect(
      rule!.condition({
        text: 'guaranteed return on this investment',
        industry: 'financial',
        locale: 'en-US',
        mentionsCompetitor: false,
        containsPricingData: false,
        containsLegalLanguage: false,
        containsComplianceTerms: false,
        targetsGovernmentSegment: false,
        containsReligiousOrPoliticalContent: false,
      }),
    ).toBe(true);
  });
});
