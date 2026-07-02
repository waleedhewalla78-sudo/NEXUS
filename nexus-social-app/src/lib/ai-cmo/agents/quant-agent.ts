/**

 * Feature 004 Sprint 16 — Quant agent (hourly/daily post_analytics time series).

 * L6: read-only DB + ProviderRouter — returns insights only.

 */



import { AbstractBaseAgent } from '@/lib/ai-cmo/agents/types/base';

import type { AgentRunOutput } from '@/lib/ai-cmo/agents/types/base';

import { fetchQuantTimeSeries } from '@/lib/ai-cmo/agents/quant-data';

import { providerRouter } from '@/lib/ai-cmo/providers/provider-router';

import {

  type QuantInsightProposal,

  type QuantRunInput,

  quantRunInputSchema,

} from '@/lib/ai-cmo/agents/types/intelligence';



const QUANT_SYSTEM = `You are Quant — analytics insight agent. Given hourly/daily time-series CTR data, return JSON:

{"summary":"string","brainHints":["hint"],"confidence":0.0-1.0}. Identify correlations like posting time vs CTR. No markdown.`;



function detectTrendFromSeries(

  daily: Awaited<ReturnType<typeof fetchQuantTimeSeries>>['daily'],

): 'up' | 'down' | 'flat' {

  if (daily.length < 2) return 'flat';

  const firstHalf = daily.slice(0, Math.floor(daily.length / 2));

  const secondHalf = daily.slice(Math.floor(daily.length / 2));

  const avgFirst =

    firstHalf.reduce((s, d) => s + d.ctr, 0) / Math.max(firstHalf.length, 1);

  const avgSecond =

    secondHalf.reduce((s, d) => s + d.ctr, 0) / Math.max(secondHalf.length, 1);

  if (avgSecond > avgFirst * 1.05) return 'up';

  if (avgSecond < avgFirst * 0.95) return 'down';

  return 'flat';

}



export class QuantAgent extends AbstractBaseAgent<QuantRunInput, QuantInsightProposal> {

  readonly agentName = 'quant' as const;



  async run(input: QuantRunInput): Promise<AgentRunOutput<QuantInsightProposal>> {

    const parsed = quantRunInputSchema.safeParse(input);

    if (!parsed.success) {

      throw this.wrapError(parsed.error.message);

    }



    const series = await fetchQuantTimeSeries(

      parsed.data.workspaceId,

      parsed.data.analytics.periodDays,

    );



    const ctr = series.totals.ctr;

    const conversionRate =

      series.totals.clicks > 0 ? series.totals.conversions / series.totals.clicks : 0;

    const trend = detectTrendFromSeries(series.daily);



    const llm = await providerRouter.generate({

      systemPrompt: QUANT_SYSTEM,

      userPrompt: JSON.stringify({ series, ctr, conversionRate, trend }),

      userId: parsed.data.userId,

      agentRole: 'quant',

      locale: parsed.data.locale,

    });



    let brainHints = [

      trend === 'down'

        ? 'Refresh creative hooks — CTR trending down'

        : 'Maintain current channel mix — performance stable',

    ];

    let summary = `CTR ${(ctr * 100).toFixed(2)}%, CVR ${(conversionRate * 100).toFixed(2)}% over ${parsed.data.analytics.periodDays}d`;

    let confidence = 0.75;



    if (llm.text) {

      try {

        const match = llm.text.match(/\{[\s\S]*\}/);

        if (match) {

          const obj = JSON.parse(match[0]) as {

            summary?: string;

            brainHints?: string[];

            confidence?: number;

          };

          if (obj.summary) summary = obj.summary;

          if (obj.brainHints?.length) brainHints = obj.brainHints;

          if (obj.confidence != null) confidence = obj.confidence;

        }

      } catch {

        // keep computed metrics

      }

    }



    const proposal: QuantInsightProposal = {

      summary,

      ctr,

      conversionRate,

      trend,

      brainHints,

      confidence,

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



export const quantAgent = new QuantAgent();

