/**
 * Creator agent — draft content from strategic plan via Dify runtime.
 */

import { providerRouter } from '@/lib/ai/providers/provider-router';
import { withAiCmoSpan } from '@/lib/telemetry/ai-cmo-tracer';
import { fetchAbmIntentContext } from '@/lib/ai-cmo/abm/intent-context';
import type { StrategicPlan } from '@/lib/ai-cmo/strategic-brain';

export type CreatorAgentInput = {
  plan: StrategicPlan;
  locale?: string;
  userId: string;
  workspaceId?: string;
  campaignId?: string | null;
  difyBaseUrl?: string;
  difyApiKey?: string;
  workspaceDifyApiKey?: string | null;
  revisionFeedback?: string;
};

export type CreatedContent = {
  caption: string;
  hashtags: string[];
  callToAction: string;
  platforms: string[];
  locale: string;
  draftMetadata: Record<string, unknown>;
};

const BILINGUAL_DIRECTIVE = `BILINGUAL DIRECTIVE: You are a bilingual AI. If the user inputs a campaign brief in Arabic, you MUST output the entire campaign strategy in formal Arabic (MSA). If the input is in English, output in English. Do not mix languages unless specifically asked.`;

const CREATOR_SYSTEM = `${BILINGUAL_DIRECTIVE}

You are the Creator agent for an AI CMO. Return JSON with: caption (string), hashtags (array), callToAction (string), platforms (array). No markdown fences.`;

function parseCreatedContent(text: string, plan: StrategicPlan, locale: string): CreatedContent {
  const fallback: CreatedContent = {
    caption: plan.keyMessages[0] ?? plan.objective,
    hashtags: ['#marketing'],
    callToAction: 'Learn more',
    platforms: plan.channels.length ? plan.channels : ['linkedin'],
    locale,
    draftMetadata: { source: 'fallback', planHorizon: plan.horizon },
  };

  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return fallback;
    const parsed = JSON.parse(match[0]) as Record<string, unknown>;
    return {
      caption: String(parsed.caption ?? fallback.caption),
      hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.map(String) : fallback.hashtags,
      callToAction: String(parsed.callToAction ?? fallback.callToAction),
      platforms: Array.isArray(parsed.platforms) ? parsed.platforms.map(String) : fallback.platforms,
      locale,
      draftMetadata: { source: 'creator_agent', planHorizon: plan.horizon },
    };
  } catch {
    return { ...fallback, caption: text.slice(0, 280) || fallback.caption };
  }
}

export async function generateCampaignContent(input: CreatorAgentInput): Promise<CreatedContent> {
  return withAiCmoSpan({
    name: 'ai_cmo.creator.generate',
    attributes: {
      workspace_id: input.workspaceId,
      campaign_id: input.campaignId ?? undefined,
    },
    fn: async () => generateCampaignContentInner(input),
  });
}

async function generateCampaignContentInner(input: CreatorAgentInput): Promise<CreatedContent> {
  const locale = input.locale ?? 'en-US';

  let abmBlock: Record<string, unknown> = {};
  if (input.workspaceId) {
    try {
      const abm = await fetchAbmIntentContext(input.workspaceId);
      abmBlock = { abmContext: abm.promptBlock, funnelStage: abm.funnelStage };
    } catch {
      // Non-blocking if ABM tables not migrated
    }
  }

  const userPrompt = JSON.stringify({
    objective: input.plan.objective,
    audience: input.plan.audience,
    keyMessages: input.plan.keyMessages,
    themes: input.plan.contentThemes,
    channels: input.plan.channels,
    locale,
    revisionFeedback: input.revisionFeedback,
    ...abmBlock,
  });

  const systemPrompt = input.revisionFeedback
    ? `${CREATOR_SYSTEM}\nRevise the draft using this quality feedback: ${input.revisionFeedback}`
    : CREATOR_SYSTEM;

  const result = await providerRouter.generate({
    systemPrompt,
    userPrompt,
    userId: input.userId,
    agentRole: 'creator',
    locale,
    difyBaseUrl: input.difyBaseUrl,
    difyApiKey: input.difyApiKey,
    workspaceDifyApiKey: input.workspaceDifyApiKey,
  });

  if (result.text) {
    return parseCreatedContent(result.text, input.plan, locale);
  }

  return parseCreatedContent('', input.plan, locale);
}

export async function reviseCampaignContent(
  input: CreatorAgentInput & { revisionFeedback: string },
): Promise<CreatedContent> {
  return generateCampaignContent({
    ...input,
    revisionFeedback: input.revisionFeedback,
  });
}

export const creatorAgentUtils = {
  generateCampaignContent,
  reviseCampaignContent,
};
