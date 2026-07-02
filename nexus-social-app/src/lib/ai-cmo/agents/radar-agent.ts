/**
 * Feature 004 Sprint 15 — Radar agent (real 003 listening integration).
 * L6: read-only DB + ProviderRouter — does NOT write to SoR.
 */

import { AbstractBaseAgent } from '@/lib/ai-cmo/agents/types/base';
import type { AgentRunOutput } from '@/lib/ai-cmo/agents/types/base';
import { fetchRecentMentionSignals } from '@/lib/ai-cmo/agents/radar-data';
import { providerRouter } from '@/lib/ai-cmo/providers/provider-router';
import {
  type DetectedSignalProposal,
  type RadarRunInput,
  radarRunInputSchema,
} from '@/lib/ai-cmo/agents/types/intelligence';

const RADAR_SYSTEM = `You are Radar — a market intelligence agent. Given external signals from social listening, return JSON:
{"recommendedAction":"string","topics":["topic"],"relevanceScore":0.0-1.0}. No markdown.`;

function parseRadarLlm(text: string): Partial<DetectedSignalProposal> {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return {};
    return JSON.parse(match[0]) as Partial<DetectedSignalProposal>;
  } catch {
    return {};
  }
}

export class RadarAgent extends AbstractBaseAgent<RadarRunInput, DetectedSignalProposal[]> {
  readonly agentName = 'radar' as const;

  async run(input: RadarRunInput): Promise<AgentRunOutput<DetectedSignalProposal[]>> {
    const parsed = radarRunInputSchema.safeParse(input);
    if (!parsed.success) {
      throw this.wrapError(parsed.error.message);
    }

    const signals =
      parsed.data.signals.length > 0
        ? parsed.data.signals
        : await fetchRecentMentionSignals({ workspaceId: parsed.data.workspaceId });

    if (signals.length === 0) {
      return {
        agentName: this.agentName,
        proposal: [],
        eventsEmitted: [],
        llmStubbed: false,
        modelUsed: 'none',
      };
    }

    const proposals: DetectedSignalProposal[] = [];

    for (const signal of signals) {
      const llm = await providerRouter.complete({
        systemPrompt: RADAR_SYSTEM,
        userPrompt: JSON.stringify({ signal, industry: parsed.data.industry }),
        userId: parsed.data.userId,
        agentRole: 'radar',
        locale: parsed.data.locale,
      });

      const parsedLlm = llm.text ? parseRadarLlm(llm.text) : {};
      const proposal: DetectedSignalProposal = {
        signalId: `sig_${Date.now()}_${proposals.length}`,
        headline: signal.headline,
        relevanceScore: parsedLlm.relevanceScore ?? signal.relevanceScore ?? 0.7,
        recommendedAction: parsedLlm.recommendedAction ?? 'Review signal for campaign angle',
        topics: parsedLlm.topics ?? ['market_trend'],
      };

      proposals.push(proposal);
    }

    return {
      agentName: this.agentName,
      proposal: proposals,
      eventsEmitted: [],
      llmStubbed: false,
      modelUsed: 'provider-router/radar',
    };
  }
}

export const radarAgent = new RadarAgent();
