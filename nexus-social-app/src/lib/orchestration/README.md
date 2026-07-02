# Orchestration Layer (Sprint 12 Stub)

PRD v3.0 specifies **Inngest** for workflow orchestration. Inngest is **not** in `package.json` (dep approval required — **A-GATE-001 / CL-002**).

## Current State (Redis fallback — production interim)

- `client.ts` — stub `OrchestrationClient` with in-memory event queue
- `workflows/campaign-workflow.ts` — pure-function workflow: plan → policy → memory → quality → publish
- `campaign-workflow-deps.ts` — wires Brain, Creator, reconciler, post link (`post_id`), approval queue
- `campaign-job-store.ts` + `jobs/campaign-orchestration.ts` — **202 + poll** async API via Redis BRPOP
- `marketing-event-worker.ts` — event consumers + Redis DLQ (not Inngest `ai_cmo_failed_jobs`)

**Do not install Inngest** until Eng Leadership signs off (A-GATE-001). Document-only until then.

## Observability (Langfuse — document only)

**Langfuse** integration is blocked pending **A-GATE-002** (CIO decision). Until approved:

- OTel spans: `src/lib/telemetry/ai-cmo-tracer.ts` on Brain, Creator, workflow, worker
- AI ops health: `GET /api/admin/ai-ops/health` (Bearer `INTERNAL_TOOL_SECRET`) aggregates Redis worker metrics
- Do **not** add `@langfuse/*` packages without leadership approval
## When Inngest Is Approved

```bash
npm install inngest
```

1. Add `src/lib/orchestration/inngest-client.ts` wrapping `new Inngest({ id: 'nexus-ai-cmo' })`
2. Add `src/app/api/inngest/route.ts` serve handler
3. Port `runCampaignWorkflow` steps to `inngest.createFunction` with `step.run()` and retries: 3
4. Wire `MarketingEventBus` subscribers to `inngest.send()`

## Retry / DLQ

Implement in Inngest function config:

```typescript
{ id: 'campaign-workflow', retries: 3 }
```

Dead-letter: Inngest built-in failure handler (Sprint 13).
