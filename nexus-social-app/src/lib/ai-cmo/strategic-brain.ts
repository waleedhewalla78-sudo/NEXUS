/**
 * Strategic Brain agent — campaign planning via Dify runtime (not orchestrator).
 */

import { providerRouter } from '@/lib/ai/providers/provider-router';
import { withAiCmoSpan } from '@/lib/telemetry/ai-cmo-tracer';
import { fetchAbmIntentContext } from '@/lib/ai-cmo/abm/intent-context';
import { getTargetAccountByIdSync } from '@/lib/ai-cmo/abm/target-account-store';
import { buildTargetAccountPromptBlock } from '@/lib/ai-cmo/abm/target-account-prompt';

export type StrategicBrainInput = {
  objective: string;
  brandName?: string;
  locale?: string;
  userId: string;
  workspaceId?: string;
  campaignId?: string | null;
  targetAccountId?: string | null;
  difyBaseUrl?: string;
  difyApiKey?: string;
  workspaceDifyApiKey?: string | null;
};

export type StrategicPlan = {
  objective: string;
  audience: string;
  channels: string[];
  keyMessages: string[];
  contentThemes: string[];
  kpis: string[];
  horizon: 'strategic' | 'tactical' | 'operational';
  rawSummary: string;
};

const BILINGUAL_DIRECTIVE = `BILINGUAL DIRECTIVE: You are a bilingual AI. If the user inputs a campaign brief in Arabic, you MUST output the entire campaign strategy in formal Arabic (MSA). If the input is in English, output in English. Do not mix languages unless specifically asked.`;

const STRATEGIC_BRAIN_SYSTEM = `${BILINGUAL_DIRECTIVE}

You are the Strategic Brain for an AI CMO platform.
Return a JSON object with keys: audience, channels (array), keyMessages (array), contentThemes (array), kpis (array), horizon (strategic|tactical|operational), summary (string).
Be concise and actionable. No markdown fences.`;

function parsePlanJson(text: string, objective: string): StrategicPlan {
  const fallback: StrategicPlan = {
    objective,
    audience: 'Primary ICP',
    channels: ['linkedin', 'x'],
    keyMessages: [objective],
    contentThemes: ['brand awareness'],
    kpis: ['engagement_rate', 'reach'],
    horizon: 'tactical',
    rawSummary: text.slice(0, 500),
  };

  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return fallback;
    const parsed = JSON.parse(match[0]) as Record<string, unknown>;
    return {
      objective,
      audience: String(parsed.audience ?? fallback.audience),
      channels: Array.isArray(parsed.channels) ? parsed.channels.map(String) : fallback.channels,
      keyMessages: Array.isArray(parsed.keyMessages) ? parsed.keyMessages.map(String) : fallback.keyMessages,
      contentThemes: Array.isArray(parsed.contentThemes) ? parsed.contentThemes.map(String) : fallback.contentThemes,
      kpis: Array.isArray(parsed.kpis) ? parsed.kpis.map(String) : fallback.kpis,
      horizon:
        parsed.horizon === 'strategic' || parsed.horizon === 'operational'
          ? parsed.horizon
          : 'tactical',
      rawSummary: String(parsed.summary ?? text).slice(0, 2000),
    };
  } catch {
    return fallback;
  }
}

export async function planCampaignStrategy(input: StrategicBrainInput): Promise<StrategicPlan> {
  return withAiCmoSpan({
    name: 'ai_cmo.strategic_brain.plan',
    attributes: {
      workspace_id: input.workspaceId,
      campaign_id: input.campaignId ?? undefined,
    },
    fn: async () => planCampaignStrategyInner(input),
  });
}

async function planCampaignStrategyInner(input: StrategicBrainInput): Promise<StrategicPlan> {
  const locale = input.locale ?? 'en-US';
  const brand = input.brandName ?? 'Brand';

  let abmBlock = '';
  if (input.targetAccountId) {
    const account = getTargetAccountByIdSync(input.targetAccountId);
    if (account) {
      abmBlock = `\n\n${buildTargetAccountPromptBlock(account)}`;
    }
  } else if (input.workspaceId) {
    try {
      const abm = await fetchAbmIntentContext(input.workspaceId);
      abmBlock = `\n\n${abm.promptBlock}`;
    } catch {
      // Non-blocking — proceed without ABM context if table not migrated yet
    }
  }

  const userPrompt = `Brand: ${brand}. Locale: ${locale}. Campaign objective: ${input.objective}${abmBlock}`;

  const result = await providerRouter.generate({
    systemPrompt: STRATEGIC_BRAIN_SYSTEM,
    userPrompt,
    userId: input.userId,
    agentRole: 'strategic_brain',
    locale,
    difyBaseUrl: input.difyBaseUrl,
    difyApiKey: input.difyApiKey,
    workspaceDifyApiKey: input.workspaceDifyApiKey,
  });

  if (result.text) {
    return parsePlanJson(result.text, input.objective);
  }

  return parsePlanJson('', input.objective);
}

export const strategicBrainUtils = {
  planCampaignStrategy,
};
