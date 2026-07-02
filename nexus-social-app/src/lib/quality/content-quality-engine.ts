export type ContentQualityInput = {
  text: string;
  existingCorpus?: string[];
  keyword?: string;
};

export type QualityScore = {
  uniqueness: number;
  eeatScore: number;
  keywordCannibalization: number;
  semanticRichness: number;
  helpfulContentScore: number;
  overallScore: number;
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/\W+/)
      .filter((t) => t.length > 2),
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function checkUniqueness(content: ContentQualityInput): number {
  const tokens = tokenize(content.text);
  if (!content.existingCorpus?.length) return 0.9;
  let maxSimilarity = 0;
  for (const existing of content.existingCorpus) {
    maxSimilarity = Math.max(maxSimilarity, jaccardSimilarity(tokens, tokenize(existing)));
  }
  return clamp01(1 - maxSimilarity);
}

function checkEEAT(content: ContentQualityInput): number {
  const text = content.text;
  let score = 0.5;
  if (/\b(expert|research|study|data|according to)\b/i.test(text)) score += 0.15;
  if (/\b(we|our team|experience|years)\b/i.test(text)) score += 0.1;
  if (text.length >= 300) score += 0.1;
  if (/\b(source|cite|reference)\b/i.test(text)) score += 0.1;
  return clamp01(score);
}

function checkCannibalization(content: ContentQualityInput): number {
  if (!content.keyword || !content.existingCorpus?.length) return 0.1;
  const keyword = content.keyword.toLowerCase();
  const matches = content.existingCorpus.filter((c) => c.toLowerCase().includes(keyword)).length;
  return clamp01(matches / Math.max(content.existingCorpus.length, 1));
}

function checkSemanticRichness(content: ContentQualityInput): number {
  const words = content.text.split(/\s+/).filter(Boolean);
  const uniqueRatio = new Set(words.map((w) => w.toLowerCase())).size / Math.max(words.length, 1);
  return clamp01(uniqueRatio * 1.2);
}

function checkHelpfulContent(content: ContentQualityInput): number {
  const text = content.text;
  let score = 0.4;
  if (/\?/.test(text)) score += 0.1;
  if (/\b(how to|guide|tips|steps|because|why)\b/i.test(text)) score += 0.2;
  if (text.length >= 150) score += 0.15;
  if (/\b(example|case study|benefit)\b/i.test(text)) score += 0.1;
  return clamp01(score);
}

export class ContentQualityEngine {
  evaluate(content: ContentQualityInput): QualityScore {
    const uniqueness = checkUniqueness(content);
    const eeatScore = checkEEAT(content);
    const keywordCannibalization = checkCannibalization(content);
    const semanticRichness = checkSemanticRichness(content);
    const helpfulContentScore = checkHelpfulContent(content);

    const overallScore = clamp01(
      (uniqueness + eeatScore + (1 - keywordCannibalization) + semanticRichness + helpfulContentScore) / 5,
    );

    return {
      uniqueness,
      eeatScore,
      keywordCannibalization,
      semanticRichness,
      helpfulContentScore,
      overallScore,
    };
  }

  shouldPublish(score: QualityScore): boolean {
    return (
      score.overallScore >= 0.8
      && score.uniqueness >= 0.75
      && score.keywordCannibalization <= 0.3
      && score.eeatScore >= 0.45
    );
  }

  shouldAutoReject(score: QualityScore): boolean {
    return (
      score.overallScore < 0.5
      || score.uniqueness < 0.4
      || score.keywordCannibalization > 0.5
      || score.eeatScore < 0.35
    );
  }

  getRejectReasons(score: QualityScore): string[] {
    const reasons: string[] = [];
    if (score.overallScore < 0.5) reasons.push('overall_score_below_minimum');
    if (score.uniqueness < 0.4) reasons.push('uniqueness_too_low');
    if (score.keywordCannibalization > 0.5) reasons.push('keyword_cannibalization');
    if (score.eeatScore < 0.35) reasons.push('eeat_score_too_low');
    return reasons;
  }
}

export const contentQualityEngineUtils = {
  ContentQualityEngine,
};
