# Technical Plan — AI CMO PRD v3.0 (Feature 004)

**Feature:** 004 AI CMO Master PRD v3.0  
**Date:** 2026-06-23  
**Workspace:** `nexus-social-app`  
**Baseline:** Sprint 12–13 complete · Feature 003 launch-ready (no regression)

---

## Document Map

| Document | Purpose |
|----------|---------|
| **This file (`plan.md`)** | Technical architecture, chosen stack, phase overview, decision log |
| [`technical-plan.md`](./technical-plan.md) | Phase A–H deep specs: components, migrations, APIs, workers, tests |
| [`implementation-plan.md`](./implementation-plan.md) | Execution tracking, leadership gates, success criteria |
| [`IMPLEMENT_PLAN_ALL_OPEN.md`](./IMPLEMENT_PLAN_ALL_OPEN.md) | Master open-work checklist with task IDs and owners |
| [`tasks.md`](./tasks.md) | Sprint task tracker (S12–S17) |

**Rule:** `plan.md` + `technical-plan.md` = **how** to build. `implementation-plan.md` + `IMPLEMENT_PLAN_ALL_OPEN.md` = **what** to track — no duplicate task lists here.

---

## Architecture Overview

Feature 004 implements the **9-layer AI CMO model** defined in the Principal AI Architect audit. Full layer specifications, boundaries, and gap analysis live in [`architecture-audit/03-refactored-architecture.md`](./architecture-audit/03-refactored-architecture.md).

```text
L1  Dashboard & Management Interface     /ai-cmo/*, explainability panels
L2  API Gateway & Edge                   /api/v1/ai-cmo/*, /api/inngest (pending)
L3  Orchestration (Inngest)              campaign-workflow, event-replan (stub → Inngest)
L4  Policy & Governance                  policy-engine, approval queue (partial)
L5  Memory & Intelligence                ai_cmo_learnings, Qdrant (planned)
L6  Agent Mesh (Dify runtime)             Brain, Creator (+ Radar, Optimizer, …)
L7  Execution & Reconciler (SoR/SoI)     reconciler.ts — mandatory write path
L8  Observability & FinOps               OTel, Langfuse (pending), cost ledger
L9  Learning Loop                        outcomes → Optimizer → learnings → Brain
```

**Constitution invariants (non-negotiable):**

- Dify is **agent runtime only** (CL-005) — never L3 orchestrator. See [`architecture-audit/04-orchestration-strategy.md`](./architecture-audit/04-orchestration-strategy.md).
- All SoR/SoI writes pass `src/lib/sync/reconciler.ts` (L7).
- Campaign orchestration maps to existing `posts` via `ai_cmo_campaigns.post_id` (CL-003) — no parallel publish pipeline.
- Event ingress uses **Redis Streams** `marketing:events` (CL-001) — not Kafka v1.

**Roadmap:** Phases A–H per [`architecture-audit/15-roadmap-phases-A-H.md`](./architecture-audit/15-roadmap-phases-A-H.md). Legacy Sprints 14–17 map to phases B–H (see [Legacy Sprint Mapping](#legacy-sprint-mapping)).

---

## Chosen Tech Stack

These are **decisions**, not proposals. Version pins from `package.json`, `.env.example`, and `docker-compose*.yml` as of 2026-06-23.

| Layer | Technology | Version / Config | Notes |
|-------|------------|------------------|-------|
| **Frontend** | Next.js | `16.2.9` | App Router, Turbopack dev |
| | React | `19.2.4` | Server Components + client islands |
| | TypeScript | `^5` | Strict |
| | Tailwind CSS | `^4` | `@tailwindcss/postcss` |
| | next-intl | `^4.13.0` | ICU messages |
| | Dev port | `:3005` | `DEV_PORT=3005` |
| **API** | Next.js route handlers + server actions | — | `/api/v1/ai-cmo/*`, future `/api/inngest` |
| **Database** | Supabase PostgreSQL + RLS | Migrations `000001`–`000013` | 004 tables: `000011`, `000012` live; `000013` draft |
| **Auth** | Supabase Auth | `@supabase/ssr ^0.12.0` | JWT + `workspace_members` RLS |
| **Cache / Queue** | Redis (ioredis) | `^5.11.1` | Streams, DLQ, worker heartbeat, BRPOP jobs |
| | Compose | `docker-compose.redis.yml` | Dev; prod in `docker-compose.prod.yml` |
| **AI runtime** | Dify | `DIFY_BASE_URL`, `DIFY_API_KEY` | Agent runtime ONLY (CL-005) |
| **AI fallback** | OpenRouter | `OPENROUTER_API_KEY` | OpenAI-compatible when Dify unavailable |
| **Vector** | Qdrant | Planned (Phase C) | pgvector fallback per CL if Qdrant deferred |
| **Orchestration** | Inngest | Pending CL-002 approval | Stub: `src/lib/orchestration/` + Redis worker |
| **Events** | Redis Streams | `marketing:events` | CL-001; bridge to Inngest when approved |
| **Automation** | Activepieces | `ACTIVEPIECES_BASE_URL` | 003 integrations; post-publish webhooks |
| **Support** | Chatwoot | `CHATWOOT_BASE_URL` | Inbox; unchanged in 004 |
| **Observability** | OpenTelemetry | `@opentelemetry/sdk-node ^0.219.0` | Existing; `npm run otel:verify` |
| | Langfuse | Pending approval | Phase F; LLM trace spans |
| **Errors** | Sentry | `@sentry/nextjs ^10.58.0` | `SENTRY_DSN` |
| **Workers** | Custom esbuild bundle | `src/bin/worker.ts` → `dist/bin/worker.js` | `npm run worker:dev` |
| **SoR writes** | Reconciler | `src/lib/sync/reconciler.ts` | Mandatory path for all `ai_cmo_*` mutations |
| **CI** | GitHub Actions | `npm run ci` | lint + test + e2e:validate + otel:verify |
| **Billing** | Stripe | `^22.2.1` | 003 baseline; Finance agent (Phase G) |

---

## Current State (2026-06-23)

| Area | Status |
|------|--------|
| Sprint 12–13 foundation | **Complete** — hierarchy, event bus, reconciler, policy/quality, Brain + Creator |
| Schema 004 | **11/11 live** (`000011` + `000012`); `schema:verify:004` green |
| Sprint 14 skeleton | **Partial** — async 202 API, Redis DLQ, MemoryRepository, Optimizer skeleton, cost ledger stub |
| Migration 000013 | **Draft** — not applied to Supabase |
| Migration 000014 | **Draft** — agencies hierarchy |
| Inngest | **Not installed** — CL-002 pending |
| Langfuse | **Not installed** — pending approval |
| Dify apps published | **Pending** — S13-T012 operator action |
| Test baseline | 94+ tests; `npm run verify:local` / `verify:staging` |

---

## Phase Overview (A–H)

Detailed component paths, migrations, API contracts, and test scripts: [`technical-plan.md`](./technical-plan.md).

| Phase | Objective | Duration | Depends | Key deliverables |
|-------|-----------|----------|---------|------------------|
| **A** | Leadership gates & operator unblock | 1 week | Sprint 13 | Inngest/Langfuse/agency approvals; Dify publish; PDPL sign-off |
| **B** | Durable orchestration | 2–3 weeks | A | Inngest functions, 202 async API, event bridge, `post_id` link, DLQ |
| **C** | Memory & closed loop | 2–3 weeks | B | 000013 applied, outcomes job, Optimizer production, Qdrant (optional) |
| **D** | FinOps & attribution | 2 weeks | B | Budget policies, cost ledger, MV refresh, attribution ingestion |
| **E** | Governance & quality | 2–3 weeks | B, C partial | Approval queue, LLM-as-Judge, MENA PDPL rules, confidence persist |
| **F** | Observability & resilience | 2 weeks | B | Langfuse, circuit breakers, AI Ops dashboard, rate limits |
| **G** | Agent mesh | 3–4 weeks | C, D, F | Radar, Channel Risk, Finance, Portfolio S&OP, event replan |
| **H** | Productization & launch | 2–3 weeks | D, E, F, G partial | Agencies migration, hierarchy UI, E2E smoke, DR, load test |

```text
Sprint 12–13 ✓
       │
       ▼
Phase A (gates) ──► Phase B (orchestration) ──┬──► Phase C (memory)
                                              ├──► Phase D (FinOps)
                                              └──► Phase F (observability)
       │
       ├──► Phase E (governance)
       ├──► Phase G (agent mesh)
       └──► Phase H (productization & launch)
```

Track open tasks by phase: [`IMPLEMENT_PLAN_ALL_OPEN.md`](./IMPLEMENT_PLAN_ALL_OPEN.md).

---

## Feature 003 Integration Plan (Summary)

Feature 003 owns **publish, OAuth, analytics truth**. Feature 004 adds **AI CMO orchestration** without modifying 003 adapters. Full wiring spec: [`technical-plan.md` § Feature 003 Integration](./technical-plan.md#feature-003-integration-plan).

| 003 Owns | 004 Adds | Integration point |
|----------|----------|-------------------|
| `posts`, publish worker | Campaign metadata | `ai_cmo_campaigns.post_id → posts.id` via reconciler (B-ORCH-007) |
| OAuth + encrypted tokens | — | No OAuth changes in 004 |
| `post_analytics`, sync jobs | Attribution events | Separate `ai_cmo_attribution_events`; outcomes from analytics (C-MEM-003) |
| `workspace_social_connections` | — | Publish handoff uses existing connections |
| Activepieces webhooks | Campaign events | Post-publish triggers unchanged |
| Dify verify script | Brain/Creator apps | Shared `npm run ai:verify` |

**Regression rule (CL-006):** 004 is additive. Do not modify OAuth handlers, publish adapters, or webhook handlers in 004 sprints unless explicitly cross-feature.

Boundary reference: [`../specs/003-real-integrations-production/plan.md`](../../specs/003-real-integrations-production/plan.md).

---

## Security & Compliance Plan (Summary)

Full spec: [`technical-plan.md` § Security & Compliance](./technical-plan.md#security--compliance-plan).

| Control | Implementation |
|---------|----------------|
| **RLS** | All `ai_cmo_*` tables scoped via `workspace_members`; tenant RLS additive for agency roll-ups (Phase H) |
| **Reconciler** | Sole write path; validation fail-closed; audit trail on mutations |
| **Token encryption** | 003 `TOKEN_ENCRYPTION_KEY` — 004 does not store OAuth tokens |
| **PDPL (MENA)** | A-GATE-005 security review; PII scrubber before memory writes (E-GOV); policy rules expansion (E-GOV-003) |
| **Approval gates** | CRITICAL tier never auto-publishes (E-GOV-001) |
| **Service-role blast radius** | Per-workspace rate limits (F-OBS-007) |

---

## Infrastructure Plan (Summary)

Full spec: [`technical-plan.md` § Infrastructure](./technical-plan.md#infrastructure-plan).

| Component | Dev | Production |
|-----------|-----|------------|
| **App** | `npm run dev` (:3005) | `docker-compose.prod.yml` (web + worker + redis + otel-collector) |
| **Redis** | `docker compose -f docker-compose.redis.yml up` | AOF persistence; HA in Phase H (H-PROD-006) |
| **Supabase** | Cloud project + SQL Editor migrations | CLI `db:migrate`; RLS enforced |
| **Dify** | `DIFY_BASE_URL` cloud or self-host | Per-workspace keys in `ai_agent_configs` |
| **Full stack** | `npm run live:stack` / walkthrough scripts | Chatwoot, Dify, Activepieces via Epic 4 compose (003) |
| **Workers** | `npm run worker:dev` | `node dist/bin/worker.js` — MUST NOT run serverless |
| **Observability** | `docker-compose.otel.yml` optional | OTEL → collector; Langfuse Phase F |

---

## Decision Log

Clarifications supersede PRD defaults. Source: [`clarifications.md`](./clarifications.md), audit docs, leadership gates.

| ID | Decision | Status | Plan sections |
|----|----------|--------|---------------|
| **CL-001** | Redis Streams (`marketing:events`) for event bus — not Kafka v1 | **Decided** | Architecture, Phase B event bridge, Infrastructure |
| **CL-002** | Inngest for orchestration — scaffold until npm approval | **Pending approval** | Phase A (A-GATE-001), Phase B |
| **CL-003** | Map campaigns to `posts` via `post_id` FK — no duplicate content | **Decided** | Feature 003 Integration, Phase B (B-ORCH-007) |
| **CL-004** | Non-destructive hierarchy backfill in 000011/000012 | **Decided** | Security (RLS), Phase H migration |
| **CL-005** | Dify = agent runtime only; orchestration in `src/lib/orchestration/` | **Decided** | Tech stack, Phase B, L6 agents |
| **CL-006** | 004 additive — no 003 OAuth/publish regression | **Decided** | Feature 003 Integration, all phases |
| **CL-007** | Migration split 000011 (hierarchy) + 000012 (foundation) | **Decided** | Database migrations |
| **A-GATE-002** | Langfuse + OTel for LLM observability | **Pending approval** | Phase F |
| **A-GATE-003** | New `agencies` table + migration 000014 | **Pending product sign-off** | Phase H |
| **A-GATE-005** | PDPL data flow security review | **Pending** | Security & Compliance |
| **Vector CL** | Qdrant primary; pgvector fallback if deferred | **Planned** | Phase C (C-MEM-005) |

Orchestration tooling rationale: [`architecture-audit/04-orchestration-strategy.md`](./architecture-audit/04-orchestration-strategy.md).

---

## Pending Approvals

| Gate | Blocks | Owner |
|------|--------|-------|
| **A-GATE-001** — Inngest npm + Cloud account (CL-002) | B-ORCH-001–005, production durable workflows | Eng Leadership |
| **A-GATE-002** — Langfuse self-host vs Cloud | F-OBS-001–002, AI Ops dashboard | CIO |
| **A-GATE-003** — Agency schema (`000014`) | H-PROD-001, hierarchy UI | Product + Eng |
| **A-GATE-004** — Dify Brain + Creator publish (S13-T012) | Live agents without OpenRouter fallback | Operator |
| **A-GATE-005** — PDPL data flow review | Memory/FinOps production writes | Security |
| **T057** — Meta App Review (003) | Facebook/Instagram production publish | Business |

---

## Legacy Sprint Mapping

| Sprint | Audit phases | Status |
|--------|--------------|--------|
| 12 | Foundation | **Complete** |
| 13 | Core value (Brain, Creator, confidence) | **Complete** (S13-T012 pending) |
| 14 | B + C + D + E (partial) | **In progress** — see IMPLEMENT_PLAN_ALL_OPEN |
| 15 | E + F + G (partial) | Planned |
| 16 | F + G + H (partial) | Planned |
| 17 | H | Planned |

---

## Regression Guardrails

- Do not modify OAuth, publish adapters, or webhook handlers unless cross-feature task explicitly requires it
- New `ai_cmo_*` tables are additive; backfill default tenants/brands for existing workspaces
- Extend `schema:verify:004` when applying 000013+; keep `schema:verify` (003) unchanged until 003 tables touched
- Workers MUST run as long-lived processes (`worker.ts`), not Vercel serverless

---

## Related Documents

- Gap analysis: [`analysis.md`](./analysis.md)
- Data model: [`data-model.md`](./data-model.md)
- Audit index: [`architecture-audit/README.md`](./architecture-audit/README.md)
- Production readiness: [`architecture-audit/16-production-readiness-assessment.md`](./architecture-audit/16-production-readiness-assessment.md)
