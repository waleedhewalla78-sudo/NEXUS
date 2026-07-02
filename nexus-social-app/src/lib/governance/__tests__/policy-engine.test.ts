import { describe, expect, it } from 'vitest';
import { PolicyEngine } from '@/lib/governance/policy-engine';

describe('PolicyEngine', () => {
  const engine = new PolicyEngine();

  it('blocks religious/political content', () => {
    const result = engine.evaluate({
      text: 'Vote for change',
      locale: 'en-US',
      mentionsCompetitor: false,
      containsPricingData: false,
      containsLegalLanguage: false,
      containsComplianceTerms: false,
      targetsGovernmentSegment: false,
      containsReligiousOrPoliticalContent: true,
      confidence: 0.95,
    });
    expect(result.approved).toBe(false);
    expect(result.violations.some((v) => v.id === 'religious-political')).toBe(true);
  });

  it('requires approval for competitor pricing claims', () => {
    const result = engine.evaluate({
      text: 'Competitor X now costs $10',
      locale: 'en-US',
      mentionsCompetitor: true,
      containsPricingData: true,
      containsLegalLanguage: false,
      containsComplianceTerms: false,
      targetsGovernmentSegment: false,
      containsReligiousOrPoliticalContent: false,
      confidence: 0.99,
    });
    expect(result.approved).toBe(false);
    expect(result.routeToApproval).toBe(true);
  });

  it('approves safe marketing copy', () => {
    const result = engine.evaluate({
      text: 'Tips for better social engagement this week.',
      locale: 'en-US',
      mentionsCompetitor: false,
      containsPricingData: false,
      containsLegalLanguage: false,
      containsComplianceTerms: false,
      targetsGovernmentSegment: false,
      containsReligiousOrPoliticalContent: false,
      confidence: 0.92,
    });
    expect(result.approved).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('requires approval for low-confidence Arabic content', () => {
    const result = engine.evaluate({
      text: 'محتوى تسويقي',
      locale: 'ar-AE',
      mentionsCompetitor: false,
      containsPricingData: false,
      containsLegalLanguage: false,
      containsComplianceTerms: false,
      targetsGovernmentSegment: false,
      containsReligiousOrPoliticalContent: false,
      confidence: 0.7,
    });
    expect(result.approved).toBe(false);
    expect(result.violations.some((v) => v.id === 'arabic-dialect-accuracy')).toBe(true);
  });
});
