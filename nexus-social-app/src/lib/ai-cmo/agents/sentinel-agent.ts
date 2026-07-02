/**

 * Feature 004 Sprint 16 — Sentinel agent (14-day time-series anomaly detection).

 * L6: read-only DB + ProviderRouter — emits events, does NOT write to SoR.

 */



import { AbstractBaseAgent } from '@/lib/ai-cmo/agents/types/base';

import type { AgentRunOutput } from '@/lib/ai-cmo/agents/types/base';

import { emitAgentEvent } from '@/lib/ai-cmo/agents/base-agent';

import { scanWorkspaceAnomalies } from '@/lib/ai-cmo/agents/sentinel-data';

import { providerRouter } from '@/lib/ai-cmo/providers/provider-router';

import {

  type AnomalyProposal,

  type MetricAnomaly,

  type SentinelRunInput,

  sentinelRunInputSchema,

} from '@/lib/ai-cmo/agents/types/intelligence';

import { AI_CMO_INNGEST_EVENT_NAMES } from '@/lib/orchestration/types/events';



const SENTINEL_SYSTEM = `You are Sentinel — anomaly response agent. Return JSON:

{"recommendedAction":"string","severity":"low|medium|high|critical"}. No markdown.`;



function severityFromDrop(dropPct: number): AnomalyProposal['severity'] {

  if (dropPct >= 50) return 'critical';

  if (dropPct >= 40) return 'high';

  if (dropPct >= 30) return 'medium';

  return 'low';

}



function filterAnomalies(anomalies: MetricAnomaly[], thresholdPct: number): MetricAnomaly[] {

  return anomalies.filter((a) => a.dropPct >= thresholdPct);

}



export class SentinelAgent extends AbstractBaseAgent<SentinelRunInput, AnomalyProposal[]> {

  readonly agentName = 'sentinel' as const;



  async run(input: SentinelRunInput): Promise<AgentRunOutput<AnomalyProposal[]>> {

    const parsed = sentinelRunInputSchema.safeParse(input);

    if (!parsed.success) {

      throw this.wrapError(parsed.error.message);

    }



    const detected =

      parsed.data.anomalies.length > 0

        ? parsed.data.anomalies

        : await scanWorkspaceAnomalies(parsed.data.workspaceId);



    const anomalies = filterAnomalies(detected, parsed.data.thresholdPct);



    const eventsEmitted: string[] = [];

    const proposals: AnomalyProposal[] = [];

    let llmStubbed = true;



    for (const anomaly of anomalies) {

      const llm = await providerRouter.generate({

        systemPrompt: SENTINEL_SYSTEM,

        userPrompt: JSON.stringify(anomaly),

        userId: parsed.data.userId,

        agentRole: 'sentinel',

      });



      if (!llm.stubbed) llmStubbed = false;



      let recommendedAction = 'Investigate creative fatigue and channel mix';

      let severity = severityFromDrop(anomaly.dropPct);



      if (llm.text) {

        try {

          const match = llm.text.match(/\{[\s\S]*\}/);

          if (match) {

            const obj = JSON.parse(match[0]) as {

              recommendedAction?: string;

              severity?: AnomalyProposal['severity'];

            };

            if (obj.recommendedAction) recommendedAction = obj.recommendedAction;

            if (obj.severity) severity = obj.severity;

          }

        } catch {

          // keep heuristic severity

        }

      }



      const proposal: AnomalyProposal = {

        anomalyId: `anom_${Date.now()}_${proposals.length}`,

        metric: anomaly.metric,

        severity,

        dropPct: anomaly.dropPct,

        recommendedAction,

      };



      proposals.push(proposal);



      const ids = await emitAgentEvent({

        name: AI_CMO_INNGEST_EVENT_NAMES.ANOMALY_DETECTED,

        data: {

          workspaceId: parsed.data.workspaceId,

          campaignId: parsed.data.campaignId,

          anomalyId: proposal.anomalyId,

          metric: proposal.metric,

          severity: proposal.severity,

          dropPct: proposal.dropPct,

          detectedAt: new Date().toISOString(),

        },

      });

      eventsEmitted.push(...ids);

    }



    return {

      agentName: this.agentName,

      proposal: proposals,

      eventsEmitted,

      llmStubbed,

      modelUsed: 'provider-router/sentinel',

    };

  }

}



export const sentinelAgent = new SentinelAgent();

