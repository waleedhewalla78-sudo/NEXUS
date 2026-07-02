import type { BuyerStage, TargetAccount } from '@/types/abm';

const BUYER_STAGE_DIRECTIVES: Record<BuyerStage, string> = {
  decision:
    'The target account is ready to buy. Generate Bottom-of-Funnel (BOFU) content: hard ROI pitches, case studies, competitive comparisons, and a strong Call-To-Action for a demo.',
  consideration:
    'The target account is evaluating options. Generate Mid-Funnel (MOFU) content: comparison guides, feature deep-dives, and webinars.',
  awareness:
    'The target account is just realizing they have a problem. Generate Top-of-Funnel (TOFU) content: educational thought leadership, industry trend reports, and generic problem-awareness posts.',
};

/**
 * English-only ABM block for LLM reasoning (output locale may still be Arabic).
 */
export function buildTargetAccountPromptBlock(account: TargetAccount): string {
  const topics = account.topics.length ? account.topics.join(', ') : 'general';
  const directive = BUYER_STAGE_DIRECTIVES[account.buyerStage];

  return [
    'ABM TARGET ACCOUNT CONTEXT (reason in English; output in requested locale):',
    `Account: ${account.name} (${account.domain})`,
    `Industry: ${account.industry ?? 'General'}`,
    `Intent score: ${account.intentScore}/100`,
    `Buyer stage: ${account.buyerStage}`,
    `Active topics: ${topics}`,
    `FUNNEL DIRECTIVE: ${directive}`,
  ].join('\n');
}

export function intentLevelLabel(score: number): 'High Intent' | 'Medium Intent' | 'Low Intent' {
  if (score >= 70) return 'High Intent';
  if (score >= 40) return 'Medium Intent';
  return 'Low Intent';
}

export function intentLevelBadgeClass(score: number): string {
  if (score >= 70) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (score >= 40) return 'bg-amber-100 text-amber-800 border-amber-200';
  return 'bg-rose-100 text-rose-800 border-rose-200';
}
