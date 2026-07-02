import { describe, expect, it } from 'vitest';
import {
  PolicyEngineV2,
  contentPieceFromPlanAndContent,
  POLICY_RULES_V2,
} from '@/lib/governance/policy-engine-v2';

describe('PolicyEngineV2', () => {
  const engine = new PolicyEngineV2();

  it('maps block action to CRITICAL risk tier', () => {
    const result = engine.evaluate({
      text: 'Community values',
      locale: 'en-US',
      mentionsCompetitor: false,
      containsPricingData: false,
      containsLegalLanguage: false,
      containsComplianceTerms: false,
      targetsGovernmentSegment: false,
      containsReligiousOrPoliticalContent: true,
    });
    expect(result.approved).toBe(false);
    expect(result.riskTier).toBe('CRITICAL');
    expect(result.requiresApproval).toBe(true);
  });

  it('maps competitor pricing to CRITICAL tier via max severity', () => {
    const result = engine.evaluate({
      text: 'Competitor pricing update',
      locale: 'en-US',
      mentionsCompetitor: true,
      containsPricingData: true,
      containsLegalLanguage: false,
      containsComplianceTerms: false,
      targetsGovernmentSegment: false,
      containsReligiousOrPoliticalContent: false,
    });
    expect(result.approved).toBe(false);
    expect(result.riskTier).toBe('CRITICAL');
    expect(result.violations.some((v) => v.id === 'competitor-pricing')).toBe(true);
  });

  it('returns LOW tier for safe content', () => {
    const result = engine.evaluate({
      text: 'Tips for better social engagement this week.',
      locale: 'en-US',
      mentionsCompetitor: false,
      containsPricingData: false,
      containsLegalLanguage: false,
      containsComplianceTerms: false,
      targetsGovernmentSegment: false,
      containsReligiousOrPoliticalContent: false,
    });
    expect(result.approved).toBe(true);
    expect(result.riskTier).toBe('LOW');
    expect(result.requiresApproval).toBe(false);
  });

  it('maps government sector to HIGH tier', () => {
    const result = engine.evaluate({
      text: 'Public sector outreach',
      locale: 'en-US',
      mentionsCompetitor: false,
      containsPricingData: false,
      containsLegalLanguage: false,
      containsComplianceTerms: false,
      targetsGovernmentSegment: true,
      containsReligiousOrPoliticalContent: false,
    });
    expect(result.approved).toBe(false);
    expect(result.riskTier).toBe('HIGH');
  });

  it('builds ContentPiece from plan and content without JSON.stringify plan wrapper', () => {
    const piece = contentPieceFromPlanAndContent({
      plan: {
        objective: 'Grow signups',
        audience: 'SMB',
        channels: ['linkedin'],
        keyMessages: ['Try our free trial'],
        contentThemes: ['trial'],
        kpis: ['signups'],
        horizon: 'tactical',
        rawSummary: 'Plan summary',
      },
      content: {
        caption: 'Start your free trial today',
        hashtags: ['#saas'],
        callToAction: 'Sign up',
        platforms: ['linkedin'],
        locale: 'en-US',
        draftMetadata: {},
      },
      locale: 'en-US',
      qualityScore: 0.92,
    });
    expect(piece.text).toContain('Start your free trial');
    expect(piece.locale).toBe('en-US');
  });

  it('maps all six policy rules in v2 engine', () => {
    expect(POLICY_RULES_V2).toHaveLength(6);
    expect(POLICY_RULES_V2.map((r) => r.id)).toEqual([
      'competitor-pricing',
      'legal-claims',
      'government-sector',
      'religious-political',
      'arabic-dialect-accuracy',
      'healthcare-financial',
    ]);
  });

  it('escalates to CRITICAL when critical severity follows high severity in violation order', () => {
    const reorderedEngine = new PolicyEngineV2([
      POLICY_RULES_V2.find((r) => r.id === 'government-sector')!,
      POLICY_RULES_V2.find((r) => r.id === 'legal-claims')!,
      ...POLICY_RULES_V2.filter(
        (r) => r.id !== 'government-sector' && r.id !== 'legal-claims',
      ),
    ]);

    const result = reorderedEngine.evaluate({
      text: 'Guaranteed public sector outreach program',
      locale: 'en-US',
      mentionsCompetitor: false,
      containsPricingData: false,
      containsLegalLanguage: true,
      containsComplianceTerms: false,
      targetsGovernmentSegment: true,
      containsReligiousOrPoliticalContent: false,
    });

    expect(result.violations.map((v) => v.id)).toEqual(['government-sector', 'legal-claims']);
    expect(result.riskTier).toBe('CRITICAL');
  });
});
