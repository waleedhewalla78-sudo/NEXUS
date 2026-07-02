/**
 * Feature 004 Phase 6 — Compliance agent (MENA/EU jurisdiction advisor).
 * Advisory pre-processor for PolicyEngine V2 — does NOT replace automated policy tiers.
 */

import { AbstractBaseAgent } from '@/lib/ai-cmo/agents/types/base';
import type { AgentRunOutput } from '@/lib/ai-cmo/agents/types/base';
import { providerRouter } from '@/lib/ai-cmo/providers/provider-router';
import {
  EU_AI_ACT_RULES,
  MENA_PDPL_RULES,
} from '@/lib/governance/policy-engine-v2';
import type { StructuredContentPiece } from '@/lib/governance/types/policy';
import {
  type ComplianceAdvisory,
  type ComplianceDataRegion,
  type ComplianceJurisdiction,
  type ComplianceRunInput,
  complianceRunInputSchema,
} from '@/lib/ai-cmo/agents/types/business';

const COMPLIANCE_SYSTEM = `You are Compliance — MENA/GDPR jurisdiction advisor for marketing content.
Return JSON: {"advisories":[{"jurisdiction":"uae_pdpl|egypt_dpl|eu_gdpr|generic","ruleId":"string","severity":"info|warning|critical","message":"string"}],"summary":"string"}.
You advise only — you do not override automated policy tiers. No markdown.`;

const LOCALE_JURISDICTION: Record<string, ComplianceJurisdiction[]> = {
  'ar-AE': ['uae_pdpl'],
  'ar-EG': ['egypt_dpl'],
  'ar-SA': ['uae_pdpl'],
  en: ['generic'],
};

function inferDataRegion(input: ComplianceRunInput): ComplianceDataRegion {
  if (input.dataRegion) return input.dataRegion;
  const locale = input.content.locale.toLowerCase();
  if (locale.startsWith('ar-') || locale.startsWith('ar_')) return 'mena';
  if (locale.startsWith('de-') || locale.startsWith('fr-') || locale.startsWith('en-gb')) return 'eu';
  return 'generic';
}

function contentPieceFromComplianceInput(input: ComplianceRunInput): StructuredContentPiece {
  const text = [input.content.caption, input.content.callToAction].filter(Boolean).join(' ');
  return {
    text,
    locale: input.content.locale,
    mentionsCompetitor: false,
    containsPricingData: false,
    containsLegalLanguage: false,
    containsComplianceTerms: false,
    targetsGovernmentSegment: false,
    containsReligiousOrPoliticalContent: false,
  };
}

function regionalRuleAdvisories(
  input: ComplianceRunInput,
  dataRegion: ComplianceDataRegion,
): ComplianceAdvisory['advisories'] {
  const piece = contentPieceFromComplianceInput(input);
  const advisories: ComplianceAdvisory['advisories'] = [];

  const regionalRules =
    dataRegion === 'mena'
      ? MENA_PDPL_RULES
      : dataRegion === 'eu'
        ? EU_AI_ACT_RULES
        : [];

  for (const rule of regionalRules) {
    if (!rule.condition(piece)) continue;
    advisories.push({
      jurisdiction: dataRegion === 'mena' ? 'uae_pdpl' : 'eu_gdpr',
      ruleId: rule.id,
      severity: rule.severity === 'critical' ? 'critical' : 'warning',
      message: rule.reason,
    });
  }

  return advisories;
}

function heuristicAdvisories(input: ComplianceRunInput): ComplianceAdvisory['advisories'] {
  const text = input.content.caption.toLowerCase();
  const advisories: ComplianceAdvisory['advisories'] = [];

  for (const jurisdiction of input.jurisdictions) {
    if (jurisdiction === 'uae_pdpl' && /personal data|phone number|email address/i.test(text)) {
      advisories.push({
        jurisdiction,
        ruleId: 'pdpl-consent-required',
        severity: 'warning',
        message: 'Personal data references may require explicit consent under UAE PDPL',
      });
    }
    if (jurisdiction === 'egypt_dpl' && /health|medical|financial advice/i.test(text)) {
      advisories.push({
        jurisdiction,
        ruleId: 'dpl-regulated-claims',
        severity: 'critical',
        message: 'Regulated sector claims require legal review under Egypt DPL context',
      });
    }
    if (jurisdiction === 'eu_gdpr' && /tracking|cookie|personalized/i.test(text)) {
      advisories.push({
        jurisdiction,
        ruleId: 'gdpr-transparency',
        severity: 'warning',
        message: 'Transparency requirements may apply for personalized marketing under GDPR',
      });
    }
  }

  return advisories;
}

export class ComplianceAgent extends AbstractBaseAgent<ComplianceRunInput, ComplianceAdvisory> {
  readonly agentName = 'compliance' as const;

  async run(input: ComplianceRunInput): Promise<AgentRunOutput<ComplianceAdvisory>> {
    const parsed = complianceRunInputSchema.safeParse(input);
    if (!parsed.success) {
      throw this.wrapError(parsed.error.message);
    }

    const dataRegion = inferDataRegion(parsed.data);
    const localePrefix = parsed.data.content.locale.split('-')[0];
    const inferred =
      LOCALE_JURISDICTION[parsed.data.content.locale] ??
      LOCALE_JURISDICTION[localePrefix] ??
      parsed.data.jurisdictions;

    const jurisdictions = [...new Set([...parsed.data.jurisdictions, ...inferred])];

    const llm = await providerRouter.complete({
      systemPrompt: COMPLIANCE_SYSTEM,
      userPrompt: JSON.stringify({
        content: parsed.data.content,
        jurisdictions,
        dataRegion,
        policyRiskTier: parsed.data.policyRiskTier,
      }),
      userId: parsed.data.userId,
      agentRole: 'compliance',
      locale: parsed.data.content.locale,
    });

    let advisories = [
      ...regionalRuleAdvisories(parsed.data, dataRegion),
      ...heuristicAdvisories({ ...parsed.data, jurisdictions }),
    ];
    let summary = advisories.length
      ? `${advisories.length} jurisdiction advisory(ies) — review alongside PolicyEngine tier`
      : 'No additional jurisdiction advisories beyond PolicyEngine';

    if (llm.text) {
      try {
        const match = llm.text.match(/\{[\s\S]*\}/);
        if (match) {
          const obj = JSON.parse(match[0]) as {
            advisories?: ComplianceAdvisory['advisories'];
            summary?: string;
          };
          if (obj.advisories?.length) advisories = [...advisories, ...obj.advisories];
          if (obj.summary) summary = obj.summary;
        }
      } catch {
        // keep heuristic + regional advisories
      }
    }

    const proposal: ComplianceAdvisory = {
      jurisdictions,
      advisories,
      augmentsPolicyEngine: true,
      replacesPolicyEngine: false,
      summary,
    };

    return {
      agentName: this.agentName,
      proposal,
      eventsEmitted: [],
      llmStubbed: llm.stubbed,
      modelUsed: llm.modelUsed,
    };
  }
}

export const complianceAgent = new ComplianceAgent();

export function resolveComplianceDataRegion(
  locale?: string,
  explicit?: ComplianceDataRegion,
): ComplianceDataRegion | undefined {
  if (explicit) return explicit;
  if (!locale) return undefined;
  const lower = locale.toLowerCase();
  if (lower.startsWith('ar-') || lower.startsWith('ar_')) return 'mena';
  if (lower.startsWith('de-') || lower.startsWith('fr-') || lower.startsWith('en-gb')) return 'eu';
  return undefined;
}
