/**
 * Feature 004 Phase 7 — Base agent abstract class + event emission helper.
 * Agents are stateless proposal generators (L6) — NO direct secureSyncToSoR.
 */

export type {
  AgentName,
  AgentRunInput,
  AgentRunOutput,
  BaseAgent,
} from '@/lib/ai-cmo/agents/types/base';

export {
  AgentRunError,
  AbstractBaseAgent,
  agentNameSchema,
  agentRunInputSchema,
} from '@/lib/ai-cmo/agents/types/base';

import { AbstractBaseAgent } from '@/lib/ai-cmo/agents/types/base';
import type { AgentRunInput, AgentRunOutput } from '@/lib/ai-cmo/agents/types/base';
import { sendAiCmoInngestEvent } from '@/lib/orchestration/inngest-client';
import type { AiCmoInngestEvent } from '@/lib/orchestration/types/events';

export async function emitAgentEvent(event: AiCmoInngestEvent): Promise<string[]> {
  const result = await sendAiCmoInngestEvent(event);
  return result.ids;
}

export const baseAgentUtils = {
  emitAgentEvent,
  AbstractBaseAgent,
};

/**
 * Conceptual fit check — Strategic Brain and Creator map to BaseAgent contract:
 * - run(input) -> structured proposal (plan / content)
 * - no direct SoR writes (workflow persists via reconciler)
 */
export function describeLegacyAgentFit(): Record<string, string> {
  return {
    strategic_brain: 'run(objective) -> StrategicPlan proposal; persisted by workflow',
    creator: 'run(plan) -> CreatedContent proposal; persisted by workflow',
    optimizer: 'run(outcomes) -> OptimizerOutput proposals; persistOptimizerLearnings in workflow',
  };
}
