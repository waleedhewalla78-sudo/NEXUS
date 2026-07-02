/**
 * Nexus Copilot — orchestrates AI CMO agents + inbox/caption helpers via Ollama-first ProviderRouter.
 */

import { planCampaignStrategy } from '@/lib/ai-cmo/strategic-brain';
import { generateCampaignContent } from '@/lib/ai-cmo/creator-agent';
import { radarAgent } from '@/lib/ai-cmo/agents/radar-agent';
import { quantAgent } from '@/lib/ai-cmo/agents/quant-agent';
import { financeAgent } from '@/lib/ai-cmo/agents/finance-agent';
import { completeViaProviderRouter } from '@/lib/ai/shared-llm';
import { listOllamaAgentModelConfig, isLocalOllamaEnabled } from '@/lib/ai/ollama/agent-models';
import { checkOllamaHealth } from '@/lib/ai/ollama/ollama-health';

export type CopilotIntent =
  | 'campaign_plan'
  | 'caption'
  | 'inbox_reply'
  | 'market_signals'
  | 'analytics_insight'
  | 'finance_summary'
  | 'agent_status'
  | 'general';

export type CopilotChatInput = {
  workspaceId: string;
  userId: string;
  message: string;
  locale?: string;
  brandName?: string;
  conversationHistory?: string[];
};

export type CopilotChatResult = {
  intent: CopilotIntent;
  reply: string;
  provider: string;
  modelUsed: string;
  data?: Record<string, unknown>;
};

const COPILOT_SYSTEM = `You are Nexus Copilot — an AI operations assistant for social media and marketing teams.
Be concise, actionable, and professional. When users ask for campaigns, captions, or inbox replies, produce ready-to-use content.
If you cannot perform an action, explain what module in Nexus Social handles it.`;

const ROUTER_SYSTEM = `Classify the user message into exactly one intent. Return JSON only: {"intent":"campaign_plan|caption|inbox_reply|market_signals|analytics_insight|finance_summary|agent_status|general"}. No markdown.`;

function detectIntentHeuristic(message: string): CopilotIntent {
  const m = message.toLowerCase();
  if (/campaign|objective|launch|strategy|plan/.test(m)) return 'campaign_plan';
  if (/caption|post|hashtag|write.*social/.test(m)) return 'caption';
  if (/reply|inbox|customer|support|message/.test(m)) return 'inbox_reply';
  if (/radar|competitor|trend|signal|mention/.test(m)) return 'market_signals';
  if (/analytics|ctr|performance|metric/.test(m)) return 'analytics_insight';
  if (/roi|cost|budget|finance|spend/.test(m)) return 'finance_summary';
  if (/status|health|ollama|agent|model/.test(m)) return 'agent_status';
  return 'general';
}

async function classifyIntent(message: string, userId: string): Promise<CopilotIntent> {
  const llm = await completeViaProviderRouter({
    systemPrompt: ROUTER_SYSTEM,
    userPrompt: message,
    userId,
    agentRole: 'copilot_router',
  });

  if (llm.text) {
    try {
      const match = llm.text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]) as { intent?: CopilotIntent };
        if (parsed.intent) return parsed.intent;
      }
    } catch {
      // fall through
    }
  }

  return detectIntentHeuristic(message);
}

export async function runCopilotChat(input: CopilotChatInput): Promise<CopilotChatResult> {
  const intent = await classifyIntent(input.message, input.userId);
  const locale = input.locale ?? 'en-US';

  switch (intent) {
    case 'campaign_plan': {
      const plan = await planCampaignStrategy({
        objective: input.message,
        brandName: input.brandName,
        locale,
        userId: input.userId,
        workspaceId: input.workspaceId,
      });
      const content = await generateCampaignContent({
        plan,
        locale,
        userId: input.userId,
        workspaceId: input.workspaceId,
      });
      return {
        intent,
        reply: `**Plan:** ${plan.rawSummary}\n\n**Draft caption:** ${content.caption}\n\n**CTA:** ${content.callToAction}\n\n**Platforms:** ${content.platforms.join(', ')}`,
        provider: 'multi-agent',
        modelUsed: 'strategic_brain+creator',
        data: { plan, content },
      };
    }

    case 'caption': {
      const llm = await completeViaProviderRouter({
        systemPrompt:
          'Write an engaging social media caption with 3-5 hashtags. Return plain text caption only.',
        userPrompt: input.message,
        userId: input.userId,
        agentRole: 'caption',
        locale,
      });
      return {
        intent,
        reply: llm.text || 'Could not generate caption — check Ollama is running.',
        provider: llm.provider,
        modelUsed: llm.modelUsed,
      };
    }

    case 'inbox_reply': {
      const history = (input.conversationHistory ?? []).slice(-5).join('\n');
      const llm = await completeViaProviderRouter({
        systemPrompt:
          'You are a helpful customer support agent. Write a concise, empathetic reply. No markdown.',
        userPrompt: history ? `Thread:\n${history}\n\nReply to:` : input.message,
        userId: input.userId,
        agentRole: 'inbox',
        locale,
      });
      return {
        intent,
        reply: llm.text || 'Could not generate reply — check Ollama is running.',
        provider: llm.provider,
        modelUsed: llm.modelUsed,
      };
    }

    case 'market_signals': {
      const output = await radarAgent.run({
        workspaceId: input.workspaceId,
        userId: input.userId,
        signals: [],
        locale,
      });
      const summary =
        output.proposal.length === 0
          ? 'No listening signals in database. Seed walkthrough data or configure reputation queries.'
          : output.proposal
              .map((p) => `- ${p.headline}: ${p.recommendedAction} (score ${p.relevanceScore})`)
              .join('\n');
      return {
        intent,
        reply: summary,
        provider: output.llmStubbed ? 'heuristic' : 'ollama',
        modelUsed: output.modelUsed ?? 'radar',
        data: { signals: output.proposal },
      };
    }

    case 'analytics_insight': {
      const output = await quantAgent.run({
        workspaceId: input.workspaceId,
        userId: input.userId,
        analytics: { impressions: 0, clicks: 0, conversions: 0, periodDays: 14 },
      });
      return {
        intent,
        reply: `${output.proposal.summary}\n\nHints:\n${output.proposal.brainHints.map((h) => `- ${h}`).join('\n')}`,
        provider: output.llmStubbed ? 'heuristic' : 'ollama',
        modelUsed: output.modelUsed ?? 'quant',
        data: { insight: output.proposal },
      };
    }

    case 'finance_summary': {
      const output = await financeAgent.run({
        workspaceId: input.workspaceId,
        userId: input.userId,
        campaignCostUsd: 0,
        revenueAttributedUsd: 0,
        periodDays: 30,
      });
      return {
        intent,
        reply: `${output.proposal.summary}\n\nHints:\n${output.proposal.budgetReallocationHints.map((h) => `- ${h}`).join('\n')}`,
        provider: output.llmStubbed ? 'heuristic' : 'ollama',
        modelUsed: output.modelUsed ?? 'finance',
        data: { finance: output.proposal },
      };
    }

    case 'agent_status': {
      const ollama = await checkOllamaHealth();
      const models = listOllamaAgentModelConfig();
      return {
        intent,
        reply: [
          `Ollama: ${ollama.ok ? 'UP' : 'DOWN'} @ ${ollama.baseUrl}`,
          ollama.models.length ? `Models: ${ollama.models.join(', ')}` : ollama.error ?? '',
          `USE_LOCAL_OLLAMA: ${isLocalOllamaEnabled()}`,
          '',
          'Per-agent models:',
          ...models.map((m) => `- ${m.role}: ${m.model}`),
        ].join('\n'),
        provider: 'system',
        modelUsed: 'n/a',
        data: { ollama, models },
      };
    }

    default: {
      const llm = await completeViaProviderRouter({
        systemPrompt: COPILOT_SYSTEM,
        userPrompt: input.message,
        userId: input.userId,
        agentRole: 'copilot',
        locale,
      });
      return {
        intent: 'general',
        reply: llm.text || 'LLM unavailable. Set USE_LOCAL_OLLAMA=true and run `ollama serve`.',
        provider: llm.provider,
        modelUsed: llm.modelUsed,
      };
    }
  }
}

export const copilotServiceUtils = { runCopilotChat, classifyIntent };
