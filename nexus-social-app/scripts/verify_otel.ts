// scripts/verify_otel.ts
/**
 * Simple script to verify that OpenTelemetry spans are being sent to the
 * local collector container (default OTLP HTTP endpoint at http://localhost:4318).
 *
 * It performs the following steps:
 *   1. Issues a sample request to an instrumented route (e.g., the Chatwoot webhook).
 *   2. Waits a short period for the span to be exported.
 *   3. Queries the collector's `/v1/traces` endpoint and prints any received
 *      traces to the console.
 *
 * Usage (run from the repository root):
 *   npx -y ts-node ./scripts/verify_otel.ts
 */
import fetch from "node-fetch";

async function triggerSampleRequest() {
  const payload = {
    event: "message_created",
    message: { message_type: 0, content: "OTEL test", id: 999 },
    conversation: { id: 888, inbox_id: 1, contact_inbox: { contact_id: 42 } },
    inbox: { id: 1 },
  };
  await fetch("http://localhost:3000/api/webhooks/chatwoot-ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function fetchTraces() {
  const collectorUrl = "http://localhost:4318/v1/traces";
  try {
    const res = await fetch(collectorUrl);
    if (!res.ok) {
      console.error(`Collector returned ${res.status}`);
      return;
    }
    const data = await res.json();
    console.log("[OTEL] Received traces:", JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Error contacting OTEL collector:", e);
  }
}

(async () => {
  console.log("[OTEL] Triggering sample request to generate span...");
  await triggerSampleRequest();
  // Give exporter time to push spans (depends on batch interval – default 5s)
  await new Promise((r) => setTimeout(r, 6000));
  console.log("[OTEL] Fetching traces from collector...");
  await fetchTraces();
})();
