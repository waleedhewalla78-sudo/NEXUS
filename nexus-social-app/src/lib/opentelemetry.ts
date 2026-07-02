// This file should be imported at the very top of your application entry point 
// (e.g., inside instrumentation.ts for Next.js App Router).

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const traceExporter = new OTLPTraceExporter({
  // e.g., Datadog, Axiom, or local Jaeger
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces', 
  headers: {
    Authorization: `Bearer ${process.env.OTEL_EXPORTER_API_KEY || ''}`,
  },
});

export const sdk = new NodeSDK({
  traceExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      // Disable noisy instrumentations if needed
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
});

// sdk.start() is typically called in `instrumentation.ts` in Next.js 13+
