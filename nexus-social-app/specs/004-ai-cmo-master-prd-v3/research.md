# Research — AI CMO PRD v3.0 Key Decisions

## 1. Orchestration: Inngest (not Dify)

**Decision:** Use **Inngest** for workflow orchestration (state machines, retries, DLQ, step persistence).

**Rationale:**
- PRD v2+ demoted Dify from orchestrator to **agent runtime only**
- Dify lacks durable cross-agent workflow state, dead-letter handling, and crash recovery
- Inngest integrates with Next.js App Router; aligns with existing background job patterns

**Status:** Task 4 (Sprint 12) — pending review after Task 1–2. No `inngest` dependency added until approved.

**Alternative considered:** Temporal — heavier ops burden; deferred unless Inngest limits hit at scale.

---

## 2. SoR / SoI: Reconciler Pattern

**Decision:** All agent mutations pass through `src/lib/sync/reconciler.ts` before Supabase/CRM writes.

**System of Record (SoR):** Supabase, CRM, Stripe — authoritative transactional data.

**System of Intelligence (SoI):** Qdrant vectors, Redis caches, agent scratch state.

**Rationale:** Prevents data drift when agents write directly to Postgres; enables audit trail via existing `audit_logs`.

**Status:** Task 3 — pending Sprint 12 review gate.

---

## 3. Dify Demoted to Runtime

**Decision:** Keep `src/lib/dify/client.ts` for RAG/chat/tool execution per workspace; remove orchestration responsibility.

**Existing code reused:**
- `ai_agent_configs` multi-tenant provisioning
- `generateCaption` and AI orchestration worker (Feature 003)
- Per-tenant `dify_app_api_key`

**No regression:** Sprint 1–11 AI paths unchanged in Sprint 12 Task 1–2.

---

## 4. Event Bus: Redis Streams (not Upstash Kafka)

**Decision:** Implement `marketing-event-bus.ts` on **existing ioredis / REDIS_URL** using **Redis Streams**, not Upstash Kafka.

**Rationale:**
- Repo already uses ioredis for queues (`queue:ai-orchestration`), rate limits, token limiter
- No Upstash Kafka client or credentials in codebase
- Redis Streams provide ordered delivery, consumer groups, and idempotency keys without new infra
- PRD mentions Upstash Kafka as ideal at 10k events/hr; Redis Streams sufficient for Sprint 12; migrate path documented

**Implementation:**
- Stream: `stream:marketing-events`
- Idempotency: `marketing-event:idempotency:{key}` SET NX + TTL (24h)
- Typed event catalog in `MarketingEventType` enum

**Future:** If throughput exceeds Redis single-node capacity, evaluate Upstash Kafka or AWS SNS/SQS with same event type contract.

---

## 5. Productization Hierarchy

**Decision:** `Tenant → Workspace → Brand → Campaign` with backward-compatible migration.

- Each existing workspace gets a default tenant (`slug` derived from workspace)
- `ai_cmo_campaigns` introduced (no legacy `campaigns` table in 003)
- RLS cascades via `workspace_members`; tenant visibility via workspace membership

---

## 6. Hierarchy vs Feature 003 `parent_client_id`

Feature 003 agency portals use `parent_client_id` on workspaces for client isolation. **Brands** layer adds sub-entity granularity within a workspace without replacing agency RLS. Both coexist; brands are optional until Sprint 17 UI.

---

## References

- [spec.md](./spec.md) — full module catalog
- [data-model.md](./data-model.md) — SQL schemas
- [003 Real Integrations](../003-real-integrations-production/README.md) — launch baseline
