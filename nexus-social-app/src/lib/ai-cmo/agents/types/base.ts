/**
 * Feature 004 Phase 7 — Base agent contract for the L6 agent mesh.
 */

import { z } from 'zod';
import { uuidLikeSchema } from '@/lib/validation/uuid-like';

export const agentNameSchema = z.enum([
  'strategic_brain',
  'creator',
  'optimizer',
  'radar',
  'quant',
  'sentinel',
  'finance',
  'compliance',
]);

export type AgentName = z.infer<typeof agentNameSchema>;

/** UUID-shaped IDs from Postgres (includes walkthrough demo workspace). */
export const workspaceIdSchema = uuidLikeSchema;

export const agentRunInputSchema = z.object({
  workspaceId: workspaceIdSchema,
  userId: z.string().min(1),
  campaignId: z.string().uuid().optional(),
  correlationId: z.string().optional(),
  locale: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type AgentRunInput = z.infer<typeof agentRunInputSchema>;

export type AgentRunOutput<TProposal = unknown> = {
  agentName: AgentName;
  proposal: TProposal;
  eventsEmitted: string[];
  llmStubbed: boolean;
  modelUsed?: string;
  error?: string;
};

export type AgentErrorCode = 'VALIDATION_ERROR' | 'PROVIDER_UNAVAILABLE' | 'RUNTIME_ERROR';

export class AgentRunError extends Error {
  readonly code: AgentErrorCode;
  readonly agentName: AgentName;

  constructor(agentName: AgentName, code: AgentErrorCode, message: string) {
    super(`[${agentName}] ${message}`);
    this.name = 'AgentRunError';
    this.code = code;
    this.agentName = agentName;
  }
}

export interface BaseAgent<TInput extends AgentRunInput, TProposal> {
  readonly agentName: AgentName;
  run(input: TInput): Promise<AgentRunOutput<TProposal>>;
}

export abstract class AbstractBaseAgent<TInput extends AgentRunInput, TProposal>
  implements BaseAgent<TInput, TProposal>
{
  abstract readonly agentName: AgentName;

  abstract run(input: TInput): Promise<AgentRunOutput<TProposal>>;

  protected wrapError(error: unknown): AgentRunError {
    const message = error instanceof Error ? error.message : String(error);
    return new AgentRunError(this.agentName, 'RUNTIME_ERROR', message);
  }
}
