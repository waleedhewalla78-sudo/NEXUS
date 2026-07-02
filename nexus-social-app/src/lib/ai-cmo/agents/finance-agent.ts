/**

 * Feature 004 Sprint 16 — Finance agent (real cost ledger + outcomes SQL).

 * L6: read-only DB + ProviderRouter — returns proposal only.

 */



import { AbstractBaseAgent } from '@/lib/ai-cmo/agents/types/base';

import type { AgentRunOutput } from '@/lib/ai-cmo/agents/types/base';

import { fetchFinanceSnapshot } from '@/lib/ai-cmo/agents/finance-data';

import { providerRouter } from '@/lib/ai-cmo/providers/provider-router';

import {

  type FinanceProposal,

  type FinanceRunInput,

  financeRunInputSchema,

} from '@/lib/ai-cmo/agents/types/business';



const FINANCE_SYSTEM = `You are Finance — campaign ROI analyst. Given real financial JSON (AI cost, revenue, net ROI), return JSON:

{"budgetReallocationHints":["hint"],"summary":"string"}. No markdown.`;



export class FinanceAgent extends AbstractBaseAgent<FinanceRunInput, FinanceProposal> {

  readonly agentName = 'finance' as const;



  async run(input: FinanceRunInput): Promise<AgentRunOutput<FinanceProposal>> {

    const parsed = financeRunInputSchema.safeParse(input);

    if (!parsed.success) {

      throw this.wrapError(parsed.error.message);

    }



    const snapshot = await fetchFinanceSnapshot(

      parsed.data.workspaceId,

      parsed.data.periodDays,

    );



    const cost = snapshot.totalAiCostUsd || parsed.data.campaignCostUsd;

    const revenue = snapshot.totalRevenueUsd || parsed.data.revenueAttributedUsd;

    const roi = cost > 0 ? Number(((revenue - cost) / cost).toFixed(4)) : 0;

    const roas = cost > 0 ? Number((revenue / cost).toFixed(4)) : 0;

    const spendUtilizationPct = parsed.data.budgetCapUsd

      ? Number(((cost / parsed.data.budgetCapUsd) * 100).toFixed(2))

      : undefined;



    const llm = await providerRouter.generate({

      systemPrompt: FINANCE_SYSTEM,

      userPrompt: JSON.stringify({ snapshot, cost, revenue, roi, roas, spendUtilizationPct }),

      userId: parsed.data.userId,

      agentRole: 'finance',

    });



    let budgetReallocationHints = [

      roi < 0

        ? 'Reduce spend on underperforming channels by 10-15%'

        : 'Maintain budget allocation; top campaigns outperforming',

    ];

    let summary = `Net ROI ${(roi * 100).toFixed(1)}%, ROAS ${roas.toFixed(2)} over ${parsed.data.periodDays}d`;



    if (llm.text) {

      try {

        const match = llm.text.match(/\{[\s\S]*\}/);

        if (match) {

          const obj = JSON.parse(match[0]) as {

            budgetReallocationHints?: string[];

            summary?: string;

          };

          if (obj.budgetReallocationHints?.length) budgetReallocationHints = obj.budgetReallocationHints;

          if (obj.summary) summary = obj.summary;

        }

      } catch {

        // keep computed summary

      }

    }



    const proposal: FinanceProposal = {

      roi,

      roas,

      spendUtilizationPct,

      budgetReallocationHints,

      summary,

    };



    return {

      agentName: this.agentName,

      proposal,

      eventsEmitted: [],

      llmStubbed: llm.stubbed,

      modelUsed: llm.modelUsed,

    };

  }

}



export const financeAgent = new FinanceAgent();

