/**
 * Persona-specific explainability outputs (PRD v3.0 Module U).
 * Executive summaries vs operator detail without exposing raw chain-of-thought.
 */

export type ExplainabilityPersona = 'executive' | 'operator' | 'compliance';

export type ExplainabilityInput = {
  persona: ExplainabilityPersona;
  decision: string;
  confidence: number;
  confidenceBand: 'low' | 'medium' | 'high';
  policySummary?: string;
  qualitySummary?: string;
  rationaleBullets?: string[];
  riskFlags?: string[];
  recommendedAction?: string;
};

export type ExplainabilityOutput = {
  persona: ExplainabilityPersona;
  headline: string;
  body: string;
  bullets: string[];
  confidenceLabel: string;
  showTechnicalDetail: boolean;
};

function formatConfidenceLabel(band: ExplainabilityInput['confidenceBand'], score: number): string {
  const pct = Math.round(score * 100);
  if (band === 'high') return `High confidence (${pct}%)`;
  if (band === 'medium') return `Moderate confidence (${pct}%)`;
  return `Low confidence (${pct}%) — review recommended`;
}

export function renderExplainability(input: ExplainabilityInput): ExplainabilityOutput {
  const confidenceLabel = formatConfidenceLabel(input.confidenceBand, input.confidence);
  const bullets = input.rationaleBullets ?? [];
  const riskFlags = input.riskFlags ?? [];

  if (input.persona === 'executive') {
    return {
      persona: 'executive',
      headline: input.decision,
      body: [
        confidenceLabel,
        input.recommendedAction ? `Recommended: ${input.recommendedAction}` : null,
        riskFlags.length ? `Risks: ${riskFlags.join('; ')}` : null,
      ]
        .filter(Boolean)
        .join('. '),
      bullets: bullets.slice(0, 3),
      confidenceLabel,
      showTechnicalDetail: false,
    };
  }

  if (input.persona === 'compliance') {
    return {
      persona: 'compliance',
      headline: `Compliance review: ${input.decision}`,
      body: [
        input.policySummary ?? 'No policy violations flagged.',
        input.qualitySummary ? `Quality: ${input.qualitySummary}` : null,
        confidenceLabel,
      ]
        .filter(Boolean)
        .join(' '),
      bullets: [...riskFlags, ...bullets].slice(0, 6),
      confidenceLabel,
      showTechnicalDetail: true,
    };
  }

  return {
    persona: 'operator',
    headline: input.decision,
    body: [
      confidenceLabel,
      input.policySummary,
      input.qualitySummary,
      input.recommendedAction ? `Next: ${input.recommendedAction}` : null,
    ]
      .filter(Boolean)
      .join(' · '),
    bullets,
    confidenceLabel,
    showTechnicalDetail: true,
  };
}

export const explainabilityUtils = {
  renderExplainability,
};
