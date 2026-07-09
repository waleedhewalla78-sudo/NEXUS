/**
 * Feature 006 Sprint 1–3 — Concierge agent (9th mesh agent).
 * Rules-based slots + optional ProviderRouter enrichment (Sprint 3).
 * Agents never write SoR directly.
 */

import {
  AbstractBaseAgent,
  type AgentRunInput,
  type AgentRunOutput,
} from '@/lib/ai-cmo/agents/types/base';
import { providerRouter } from '@/lib/ai-cmo/providers/provider-router';
import {
  draftMasriReply,
  extractQualificationSlots,
  scoreSlots,
  type QualificationSlots,
} from '@/lib/ai-cmo/conversation/qualification';
import {
  CONCIERGE_SYSTEM,
  domainFromEmail,
  mergeSlots,
  parseConciergeLlmJson,
} from '@/lib/ai-cmo/conversation/llm-enrichment';
import { resolveConversationMode } from '@/lib/ai-cmo/conversation/shadow-mode';

export type ConciergeProposal = {
  slots: QualificationSlots;
  score: number;
  band: 'cold' | 'warm' | 'hot' | 'qualified';
  reasons: string[];
  draftReply: string;
  mode: 'shadow' | 'ai_active' | 'off';
  autoSend: boolean;
  locale: string;
  accountDomain: string | null;
};

export type ConciergeRunInput = AgentRunInput & {
  inboundText: string;
  conversationId?: string;
  channel?: string;
  /** Skip LLM even if providers available (tests / cost control). */
  rulesOnly?: boolean;
};

export class ConciergeAgent extends AbstractBaseAgent<ConciergeRunInput, ConciergeProposal> {
  readonly agentName = 'concierge' as const;

  async run(input: ConciergeRunInput): Promise<AgentRunOutput<ConciergeProposal>> {
    try {
      if (!input.inboundText?.trim()) {
        return {
          agentName: this.agentName,
          proposal: {
            slots: {},
            score: 0,
            band: 'cold',
            reasons: ['empty_inbound'],
            draftReply: '',
            mode: 'shadow',
            autoSend: false,
            locale: input.locale ?? 'ar-EG',
            accountDomain: null,
          },
          eventsEmitted: [],
          llmStubbed: true,
          error: 'inboundText required',
        };
      }

      const locale = input.locale ?? 'ar-EG';
      let slots = extractQualificationSlots(input.inboundText);
      let draftReply = draftMasriReply(slots, locale);
      let llmStubbed = true;
      let modelUsed: string | undefined;

      const allowLlm =
        !input.rulesOnly && process.env.CONCIERGE_RULES_ONLY !== 'true';

      if (allowLlm) {
        try {
          const llm = await providerRouter.complete({
            system: CONCIERGE_SYSTEM,
            prompt: `Locale: ${locale}\nInbound:\n${input.inboundText}`,
            agentRole: 'inbox',
            workspaceId: input.workspaceId,
          });
          const parsed = parseConciergeLlmJson(llm.text);
          slots = mergeSlots(slots, parsed.slots);
          if (parsed.draftReply?.trim()) draftReply = parsed.draftReply.trim();
          llmStubbed = Boolean(llm.stubbed) || llm.provider === 'none';
          modelUsed = llm.modelUsed;
        } catch {
          // Fall back to rules-only — never fail the inbound path on LLM errors.
          llmStubbed = true;
        }
      }

      const { score, band, reasons } = scoreSlots(slots);
      const mode = resolveConversationMode(null);
      const autoSend = mode === 'ai_active';
      const accountDomain = domainFromEmail(slots.contactEmail ?? null);

      return {
        agentName: this.agentName,
        proposal: {
          slots,
          score,
          band,
          reasons,
          draftReply,
          mode,
          autoSend,
          locale,
          accountDomain,
        },
        eventsEmitted: ['conversation.qualified.draft'],
        llmStubbed,
        modelUsed,
      };
    } catch (error) {
      throw this.wrapError(error);
    }
  }
}

export const conciergeAgent = new ConciergeAgent();
