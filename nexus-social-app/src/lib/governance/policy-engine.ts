export type ContentPiece = {
  text: string;
  locale: string;
  industry?: string;
  mentionsCompetitor: boolean;
  containsPricingData: boolean;
  containsLegalLanguage: boolean;
  containsComplianceTerms: boolean;
  targetsGovernmentSegment: boolean;
  containsReligiousOrPoliticalContent: boolean;
  confidence: number;
};

export type PolicySeverity = 'critical' | 'high' | 'medium' | 'low';
export type PolicyAction = 'block' | 'require_approval' | 'flag' | 'allow';

export type PolicyRule = {
  id: string;
  name: string;
  condition: (content: ContentPiece) => boolean;
  action: PolicyAction;
  severity: PolicySeverity;
  reason: string;
};

export type PolicyViolation = Pick<PolicyRule, 'id' | 'name' | 'action' | 'severity' | 'reason'>;

export type PolicyResult = {
  approved: boolean;
  reason: string;
  violations: PolicyViolation[];
  routeToApproval?: boolean;
};

export const POLICY_RULES: PolicyRule[] = [
  {
    id: 'competitor-pricing',
    name: 'Competitor Pricing Claims',
    condition: (c) => c.mentionsCompetitor && c.containsPricingData,
    action: 'require_approval',
    severity: 'critical',
    reason: 'Pricing claims require legal verification',
  },
  {
    id: 'legal-claims',
    name: 'Legal/Regulatory Claims',
    condition: (c) => c.containsLegalLanguage || c.containsComplianceTerms,
    action: 'require_approval',
    severity: 'critical',
    reason: 'Legal claims require counsel review',
  },
  {
    id: 'government-sector',
    name: 'Government Sector Content',
    condition: (c) => c.targetsGovernmentSegment,
    action: 'require_approval',
    severity: 'high',
    reason: 'Government content has strict compliance requirements',
  },
  {
    id: 'religious-political',
    name: 'Religious/Political Topics',
    condition: (c) => c.containsReligiousOrPoliticalContent,
    action: 'block',
    severity: 'critical',
    reason: 'Brand safety: avoid religious/political topics entirely',
  },
  {
    id: 'arabic-dialect-accuracy',
    name: 'Arabic Dialect Accuracy',
    condition: (c) => c.locale.startsWith('ar-') && c.confidence < 0.9,
    action: 'require_approval',
    severity: 'high',
    reason: 'Arabic dialect errors can damage brand in MENA',
  },
  {
    id: 'healthcare-financial',
    name: 'Healthcare/Financial Services',
    condition: (c) => c.industry === 'healthcare' || c.industry === 'financial',
    action: 'require_approval',
    severity: 'high',
    reason: 'Regulated industries require compliance review',
  },
];

function toViolation(rule: PolicyRule): PolicyViolation {
  return {
    id: rule.id,
    name: rule.name,
    action: rule.action,
    severity: rule.severity,
    reason: rule.reason,
  };
}

export class PolicyEngine {
  constructor(private readonly rules: PolicyRule[] = POLICY_RULES) {}

  evaluate(content: ContentPiece): PolicyResult {
    const violations = this.rules.filter((rule) => rule.condition(content)).map(toViolation);

    if (violations.some((v) => v.severity === 'critical' && v.action === 'block')) {
      return {
        approved: false,
        reason: 'Critical policy violation',
        violations,
      };
    }

    if (violations.some((v) => v.action === 'require_approval')) {
      return {
        approved: false,
        reason: 'Requires human approval',
        violations,
        routeToApproval: true,
      };
    }

    return { approved: true, reason: 'Approved', violations: [] };
  }
}

export const policyEngineUtils = {
  PolicyEngine,
  POLICY_RULES,
};
