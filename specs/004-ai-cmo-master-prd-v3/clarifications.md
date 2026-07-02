# Clarifications: AI CMO PRD v3.0 (Sprint 12)

Resolved ambiguities for implementation. These decisions supersede PRD defaults where noted.

## CL-001: Event Bus — Redis Streams vs Upstash Kafka

**Decision:** Use **Redis Streams** via existing `ioredis` (`REDIS_URL`, `src/lib/cache.ts` pattern).

**Rationale:** `ioredis` is already a production dependency for workers and caching. Upstash Kafka is not in `package.json` and adds infra cost without proven need at Sprint 12 scale.

**Implementation:** `src/lib/events/marketing-event-bus.ts` — `XADD` to `marketing:events`, consumer groups, idempotency keys in Redis `SET NX`.

**Future:** Swap transport behind `MarketingEventBus` interface if Kafka is approved (Sprint 13+).

## CL-002: Orchestration — Inngest vs Temporal

**Decision:** **Scaffold without new npm dependency.** Interface + `campaign-workflow.ts` pure-function skeleton in `src/lib/orchestration/`. Document Inngest install in `src/lib/orchestration/README.md`.

**Rationale:** PRD prefers Inngest; adding deps requires explicit approval. Skeleton preserves workflow steps (plan → policy → memory → quality → publish) for drop-in Inngest wiring.

**Future:** `npm install inngest` + `src/app/api/inngest/route.ts` when approved.

## CL-003: `ai_cmo_campaigns` vs Existing `posts`

**Decision:** **Map, don't duplicate.**

| Concept | Table | Notes |
|---------|-------|-------|
| Campaign (AI CMO orchestration unit) | `ai_cmo_campaigns` | Metadata: objective, status, brand |
| Content execution | `posts` | Existing publish pipeline (Feature 003) |
| Link | `ai_cmo_campaigns.post_id → posts.id` | One primary post per campaign |
| Content pieces (evaluations) | `ai_cmo_content_pieces` | Optional `post_id` FK; content JSONB for pre-publish drafts |

Do **not** create a parallel `campaigns` table or duplicate post content in campaign rows.

## CL-004: Hierarchy Migration for Existing Workspaces

**Decision:** Non-destructive backfill in migrations `20260624_000011_ai_cmo_hierarchy.sql` + `20260624_000012_ai_cmo_foundation.sql`:

1. Insert default tenant `default-org` if missing.
2. Set `workspaces.tenant_id` for all NULL rows to default tenant.
3. Insert one `brands` row per workspace (name = workspace name) where none exists.
4. `tenant_id` remains nullable on schema for forward compatibility; backfill ensures zero orphan workspaces.

Existing RLS on `workspace_members` remains the primary access boundary; tenant RLS is additive for agency roll-ups (Sprint 13 UI).

## CL-005: Dify Client Reference

PRD references `src/lib/dify/client.ts` — **not present** in repo. AI runtime uses OpenRouter + `ai_agent_configs` (Feature 003). Dify demotion is architectural only; no Dify orchestrator code to remove.

## CL-006: Regression Boundary with Feature 003

Sprint 12 additions are **additive**: new tables, new `src/lib/{events,sync,orchestration,governance,evaluation,quality}` modules. Do not modify OAuth, publishers, analytics ingestion, or worker publish loops except via reconciler opt-in (future Sprint 13 wiring).
