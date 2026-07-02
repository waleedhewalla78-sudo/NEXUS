import type { CampaignBriefInput } from './schema';
import { getTargetAccountByIdSync } from '@/lib/ai-cmo/abm/target-account-store';

/** Assemble a structured objective for Strategic Brain from executive brief fields. */
export function assembleCampaignObjectiveFromBrief(brief: CampaignBriefInput): string {
  const secondaries = (brief.secondaryObjectives ?? [])
    .filter((s): s is string => Boolean(s?.trim()))
    .map((s, i) => `${i + 1}. ${s.trim()}`);

  const targetAccount = brief.targetAccountId
    ? getTargetAccountByIdSync(brief.targetAccountId)
    : null;

  const sections = [
    `You are a ${brief.seniority.toLowerCase()}-level expert system acting as a:`,
    `${brief.role} | ${brief.seniority} | ${brief.domain}`,
    '',
    ...(targetAccount
      ? [
          'TARGET ABM ACCOUNT',
          `${targetAccount.name} (${targetAccount.domain}) · Intent ${targetAccount.intentScore}/100 · Stage: ${targetAccount.buyerStage}`,
          `Topics: ${targetAccount.topics.join(', ') || 'general'}`,
          '',
        ]
      : []),
    'CONTEXT',
    brief.context.trim(),
    '',
    'OBJECTIVE',
    `Core: ${brief.coreObjective.trim()}`,
    ...(secondaries.length ? ['Secondary:', ...secondaries] : []),
    '',
    'TARGET USER',
    `Role: ${brief.targetRole} | Experience: ${brief.experienceLevel} | Market: ${brief.market}`,
    '',
    `ARTIFACT TYPE: ${brief.artifactType}`,
    '',
    'OUTPUT REQUIREMENTS: Practical, actionable, no fluff. Align with brand-safe social campaign execution.',
    '',
    'STRUCTURE (MANDATORY): Executive Summary; Assumptions; Strategic Logic; Detailed Sections;',
    'Tools/Dependencies; Risks; Optimization Notes; Final Checklist.',
    '',
    'FORMAT: Clear headings, bullets, tables where useful; numbered steps for actions.',
    'No emojis or legal disclaimers in generated content.',
  ];

  return sections.join('\n');
}
