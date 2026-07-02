// INSTALL: @opentelemetry/api @opentelemetry/sdk-node
/**
 * Feature 004 Phase 4 — OTel + Langfuse agent trace wrapper.
 * Links Inngest workflow runs via propagated trace_id.
 */

import { SpanStatusCode, trace } from '@opentelemetry/api';
import { createAiCmoTrace } from '@/lib/observability/langfuse-client';
import { estimateTokensFromText } from '@/lib/ai-cmo/finops/cost-ledger';

const tracer = trace.getTracer('nexus-ai-cmo-agents');

export type TraceAgentCallInput<T> = {
  agentName: string;
  workspaceId: string;
  userId?: string;
  traceId?: string;
  sessionId?: string;
  model?: string;
  input?: unknown;
  fn: () => Promise<T>;
};

export type TracedAgentResult<T> = {
  result: T;
  latencyMs: number;
  tokenUsage?: number;
  traceId: string;
};

export async function traceAgentCall<T>(params: TraceAgentCallInput<T>): Promise<TracedAgentResult<T>> {
  const spanName = `agent.${params.agentName.replace(/\//g, '.')}`;
  const startedAt = Date.now();

  const activeSpan = trace.getActiveSpan();
  const parentTraceId = params.traceId ?? activeSpan?.spanContext().traceId;

  const langfuseTrace = createAiCmoTrace({
    name: spanName,
    workspaceId: params.workspaceId,
    userId: params.userId,
    sessionId: params.sessionId ?? params.traceId,
    input: params.input,
    metadata: {
      agentName: params.agentName,
      model: params.model,
      parentTraceId,
    },
    tags: ['agent-call', params.agentName],
  });

  return tracer.startActiveSpan(spanName, async (span) => {
    span.setAttribute('workspace_id', params.workspaceId);
    span.setAttribute('agent.name', params.agentName);
    if (params.model) span.setAttribute('llm.model', params.model);
    if (parentTraceId) span.setAttribute('trace.parent_id', parentTraceId);
    span.setAttribute('langfuse.trace_id', langfuseTrace.id);

    try {
      const result = await params.fn();
      const latencyMs = Date.now() - startedAt;
      const outputText = typeof result === 'string' ? result : JSON.stringify(result);
      const tokenUsage = estimateTokensFromText(outputText);

      span.setAttribute('agent.latency_ms', latencyMs);
      span.setAttribute('llm.token_count', tokenUsage);
      langfuseTrace.event('agent.completed', { latencyMs, tokenUsage });

      await langfuseTrace.end({ latencyMs, tokenUsage });

      return {
        result,
        latencyMs,
        tokenUsage,
        traceId: langfuseTrace.id,
      };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      langfuseTrace.event('agent.error', { message: error.message });
      await langfuseTrace.end({ error: error.message });
      throw err;
    } finally {
      span.end();
    }
  });
}

export const traceWrapperUtils = {
  traceAgentCall,
};
