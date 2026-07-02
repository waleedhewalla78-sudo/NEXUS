import { SpanStatusCode, trace } from '@opentelemetry/api';

const tracer = trace.getTracer('nexus-ai-cmo');

export async function withAiCmoSpan<T>({
  name,
  attributes,
  fn,
}: {
  name: string;
  attributes?: Record<string, string | number | boolean | undefined>;
  fn: () => Promise<T>;
}): Promise<T> {
  return tracer.startActiveSpan(name, async (span) => {
    if (attributes) {
      for (const [key, value] of Object.entries(attributes)) {
        if (value !== undefined) {
          span.setAttribute(key, value);
        }
      }
    }

    try {
      return await fn();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      throw err;
    } finally {
      span.end();
    }
  });
}

export const aiCmoTracerUtils = {
  withAiCmoSpan,
};
