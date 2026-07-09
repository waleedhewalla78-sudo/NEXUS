/**
 * Feature 006 Phase 2 — Escalation decision (FR-087).
 */

export type ConversationSentiment = 'negative' | 'neutral' | 'positive' | 'hostile';

export type EscalationDecision = {
  shouldEscalate: boolean;
  reason: string | null;
  sentiment: ConversationSentiment;
};

const LEGAL_THREAT_RE =
  /lawsuit|lawyer|attorney|محامي|قضية|سأشتكي|police|شرطة|sue\b|legal action/i;
const HOSTILE_RE =
  /idiot|stupid|scam|fraud|احتيال|نصب|حرامية|fuck|shit|كره|غبي/i;
const NEGATIVE_RE =
  /angry|furious|disappointed|terrible|awful|hate|زعلان|غضبان|سيء|مش راضي|refund|استرجاع/i;

export const LOW_CONFIDENCE_THRESHOLD = 0.35;

export function classifyConversationSentiment(text: string): ConversationSentiment {
  if (LEGAL_THREAT_RE.test(text) || HOSTILE_RE.test(text)) return 'hostile';
  if (NEGATIVE_RE.test(text)) return 'negative';
  return 'neutral';
}

/** Decide whether Concierge must escalate to Pit Crew (Chatwoot). */
export function decideEscalation(input: {
  inboundText: string;
  confidence: number;
  draftReply?: string | null;
}): EscalationDecision {
  const sentiment = classifyConversationSentiment(input.inboundText);
  const draft = input.draftReply ?? '';

  if (LEGAL_THREAT_RE.test(input.inboundText) || LEGAL_THREAT_RE.test(draft)) {
    return { shouldEscalate: true, reason: 'legal_threat', sentiment: 'hostile' };
  }
  if (sentiment === 'hostile') {
    return { shouldEscalate: true, reason: 'hostile_sentiment', sentiment };
  }
  if (sentiment === 'negative') {
    return { shouldEscalate: true, reason: 'negative_sentiment', sentiment };
  }
  if (input.confidence <= LOW_CONFIDENCE_THRESHOLD) {
    return { shouldEscalate: true, reason: 'low_confidence', sentiment };
  }
  if (draft.includes('[ESCALATE_TO_HUMAN]')) {
    return { shouldEscalate: true, reason: 'model_escalate_flag', sentiment };
  }

  return { shouldEscalate: false, reason: null, sentiment };
}
