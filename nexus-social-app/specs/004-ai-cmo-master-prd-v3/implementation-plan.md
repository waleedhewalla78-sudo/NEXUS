# Implementation Plan: AI CMO Architecture Audit → Phases A–H

**Feature:** 004 AI CMO Master PRD v3.0  
**Date:** 2026-06-23  
**Baseline:** Sprint 12–13 complete · 94+ tests · `schema:verify:004` 11/11  
**Master open-work plan:** [IMPLEMENT_PLAN_ALL_OPEN.md](./IMPLEMENT_PLAN_ALL_OPEN.md)  
**Audit pack:** `specs/004-ai-cmo-master-prd-v3/architecture-audit/`

---

## Document Map

| Document | Purpose |
|----------|---------|
| [`plan.md`](./plan.md) | Technical architecture, chosen stack, phase overview, decision log |
| [`technical-plan.md`](./technical-plan.md) | Phase A–H deep specs: components, migrations, APIs, workers, tests |
| **This file** | Execution tracking, leadership gates, success criteria |
| [`IMPLEMENT_PLAN_ALL_OPEN.md`](./IMPLEMENT_PLAN_ALL_OPEN.md) | Master open-work checklist with task IDs and owners |

**Rule:** `plan.md` + `technical-plan.md` = **how** to build. This file + `IMPLEMENT_PLAN_ALL_OPEN.md` = **what** to track.

---

## Overview

Sprint 12–13 delivered a credible foundation (hierarchy schema, reconciler, policy/quality engines, Strategic Brain + Creator agents, event bus interface). The Principal AI Architect audit (2026-06-23) finds **~35% Module A–W runtime implemented** and **not production-ready for 5,000 workspaces**. This plan maps audit gaps to Phases A–H and the first implementation wave (Phase A gate + Sprint 14 / Phase B–E partial).

**Repo source of truth:** this file mirrors the Notion Implementation Plan under Feature 004.

---

## Linked Specifications

| Document | Path |
|----------|------|
| PRD v3 spec | `specs/004-ai-cmo-master-prd-v3/spec.md` |
| Technical plan (stack + phases) | `specs/004-ai-cmo-master-prd-v3/plan.md` |
| Phase specifications (A–H detail) | `specs/004-ai-cmo-master-prd-v3/technical-plan.md` |
| Task tracker | `specs/004-ai-cmo-master-prd-v3/tasks.md` |
| Gap register | `specs/004-ai-cmo-master-prd-v3/analysis.md` |
| Clarifications | `specs/004-ai-cmo-master-prd-v3/clarifications.md` |
| **Audit index** | `architecture-audit/README.md` |
| Executive audit | `architecture-audit/01-executive-audit.md` |
| Gap matrix | `architecture-audit/02-gap-analysis-matrix.md` |
| 9-layer architecture | `architecture-audit/03-refactored-architecture.md` |
| Orchestration strategy | `architecture-audit/04-orchestration-strategy.md` |
| Memory & learning | `architecture-audit/05-memory-learning-layer.md` |
| Policy & governance | `architecture-audit/06-policy-governance.md` |
| Quality evaluation | `architecture-audit/07-quality-evaluation.md` |
| Optimizer agent | `architecture-audit/08-optimizer-agent.md` |
| FinOps framework | `architecture-audit/09-finops-framework.md` |
| Observability | `architecture-audit/10-observability.md` |
| SEO hardening | `architecture-audit/11-seo-hardening.md` |
| Multi-tenant productization | `architecture-audit/12-multi-tenant-productization.md` |
| Disaster recovery | `architecture-audit/13-disaster-recovery.md` |
| PRD v3.1 consolidated | `architecture-audit/14-prd-v3-consolidated.md` |
| Roadmap Phases A–H | `architecture-audit/15-roadmap-phases-A-H.md` |
| Production readiness | `architecture-audit/16-production-readiness-assessment.md` |

**Audit status (2026-06-23):** Documents 03–16 complete. See audit index for phase-to-document mapping.

---

## Requirements Summary (from Audit)

### Functional

- **Durable orchestration:** Inngest workflows with retries, DLQ, async campaign API (202 + job ID)
- **Event-driven replanning:** Marketing event bus consumers in `worker.ts` → Inngest triggers
- **Closed-loop memory:** MemoryRepository on `ai_cmo_learnings`; outcome ingestion; Optimizer agent
- **FinOps runtime:** Token/cost writes to `ai_cmo_cost_ledger`; `budget_policies` pre-flight caps
- **Attribution runtime:** Events → `ai_cmo_attribution_events`; MV refresh cron
- **SoR/SoI completion:** Campaign → `posts` via reconciler; `post_id` FK populated
- **Governance:** Human approval queue; LLM-as-Judge; confidence persistence; structured policy classification
- **Agent mesh (later phases):** Radar, Channel Risk, Finance, Compliance, Quant, Sentinel
- **Agency productization:** `agencies` table; Tenant → Agency → Client Brand hierarchy
- **Observability:** Langfuse + OTel baseline; AI Ops dashboard; circuit breakers

### Non-Functional

| Metric | Target |
|--------|--------|
| Workspaces | 5,000+ |
| Agencies | 500+ |
| AI assets/month | 100k |
| Uptime | 99.9% |
| Agent latency p95 | < 30 s |
| Reconciler latency | < 100 ms |
| Policy violation rate | 0% |

### Current State (verified 2026-06-24)

- Sprint 12–13 code complete; S13-T012 Dify publish pending (operator)
- Sprint 14 Phase B–E partial (2026-06-24): worker consumers, Redis DLQ, async campaign jobs, MemoryRepository, Optimizer skeleton, FinOps cost writes, budget policy stub, evaluation/confidence persistence, migration 000013 draft
- Inngest **not installed** (CL-002 — stub only; Redis worker fallback active)
- Langfuse **not installed** (pending approval)
- 2 of 8 PRD agents implemented (Strategic Brain, Creator); Optimizer skeleton added

---

## Technical Approach

> Full stack table, infrastructure, and per-phase component paths: [`plan.md`](./plan.md) · [`technical-plan.md`](./technical-plan.md)

### Orchestration

**Decision (CL-002, pending approval):** **Inngest** — Dify demoted to agent runtime only (CL-005). Port `runCampaignWorkflow` steps to `inngest.createFunction` with `step.run()`, retries: 3, built-in DLQ. Dep approval required before `npm install inngest`. Interim: Redis worker (`campaign-orchestration.ts`).

### SoR / SoI

All agent writes via `src/lib/sync/reconciler.ts`. Campaign metadata in `ai_cmo_campaigns`; publish execution via existing 003 `posts` pipeline (`post_id` FK). Extend reconciler with `updateSoR` for status transitions.

### Event Bus

Redis Streams (`marketing-event-bus.ts`) — partition by workspace hash at scale (Phase F). Consumers register in `src/bin/worker.ts`.

### Memory & Learning

PostgreSQL (`ai_cmo_learnings`, `ai_cmo_campaign_outcomes`, `ai_cmo_strategy_history`) + Qdrant hybrid retrieval. Outcome job syncs `post_analytics` → outcomes. Optimizer closes decision → outcome → lesson loop.

### FinOps

Middleware on every agent call: token count → `ai_cmo_cost_ledger`. Pre-flight `budget_policies` check at orchestration step 0. Unified reporting MV joining `ai_credit_ledger` (003) and `ai_cmo_cost_ledger` (004).

### Observability

**Decision (audit recommendation):** **Langfuse + OpenTelemetry** for LLM traces; Sentry for errors; AI Ops dashboard (Phase F). Install after leadership approval.

### Agency Hierarchy

**Decision (audit recommendation):** New `agencies` table + `brands.agency_id` (migration 000014), not extend `tenants` alone. Enables 500-agency billing isolation (Phase H).

---

## Implementation Phases A–H

| Phase | Name | Goal | Effort | Primary gaps |
|-------|------|------|--------|--------------|
| **A** | Gate | Leadership approvals; operator unblock | 3–5 days | Inngest, Langfuse, agency schema, Dify publish |
| **B** | Orchestration | Async durable workflows | 2–3 weeks | C1, C2, C5, H4, H8, M2 |
| **C** | Memory loop | Closed-loop learning | 2 weeks | C6, H1, H2, M1, M3 |
| **D** | FinOps | Cost control + attribution runtime | 1–2 weeks | C3, H9, M12 |
| **E** | Governance | Risk-based approval + evaluation | 2 weeks | C8, H3, H6, H11, H13, H14 |
| **F** | Observability | AI Ops, circuit breakers, resilience | 2 weeks | C7, H7, H12, N, M13 |
| **G** | Agent mesh | Radar, Channel Risk, Finance, S&OP | 3 weeks | H5, M4–M8 |
| **H** | Productization | Agency migration, hierarchy UI, DR, launch | 3–4 weeks | C4, M9–M11, M15 |

### Dependency Order

```text
Phase A (Gate) ──► Leadership: Inngest, Langfuse, agency schema
       │
Phase B (Orchestration) ──► async API, worker consumers, post_id, DLQ
       │
Phase C (Memory) ──► repository, outcomes, Optimizer, decision ledger
       │
Phase D (FinOps) ──► ledger writes, budget_policies, MV refresh
       │
Phase E (Governance) ──► approval queue, LLM-as-Judge, PII scrub
       │
Phase F (Observability) ──► Langfuse, circuit breakers, AI Ops UI
       │
Phase G (Agent mesh) ──► Radar, Channel Risk, Finance, Portfolio
       │
Phase H (Productization) ──► agencies migration, hierarchy UI, E2E, DR
```

### Legacy Sprint Mapping

| Sprint | Audit phases | Focus |
|--------|--------------|-------|
| 14 | B + C + D + E (partial) | Orchestration, memory, FinOps, eval baseline |
| 15 | E + F + G (partial) | Governance hardening, observability, Radar |
| 16 | F + G + H (partial) | AI Ops, Compliance, agency prep |
| 17 | H | Hierarchy UI, launch hardening, E2E |

---

## First Wave Tasks (Phase A + Sprint 14)

See Notion Tasks DB — Task IDs `A-GATE-*`, `B-ORCH-*`, `C-MEM-*`, `D-FIN-*`, `E-GOV-*`.

---

## Dependencies

| Dependency | Blocks | Owner |
|------------|--------|-------|
| Inngest npm approval (CL-002) | B-ORCH-001 through B-ORCH-005 | Engineering leadership |
| Langfuse approval | OTel/Langfuse instrumentation (Phase F) | Engineering leadership |
| Agency schema decision | Migration 000014 (Phase H) | Product + Engineering |
| Dify app publish (S13-T012) | Live Brain/Creator without OpenRouter fallback | Operator |
| Feature 003 publish worker | B-ORCH-007 post_id wiring | Sprint 14 (no 003 regression) |
| Meta App Review (003 T057) | Facebook/Instagram production publish | Business (parallel track) |

---

## Risks & Mitigation

| Risk | Severity | Mitigation |
|------|----------|------------|
| Inngest not approved | High | Extend worker polling stub; document fallback in `orchestration/README.md` |
| Sync campaign API timeout at scale | Critical | Phase B async 202 pattern before load test |
| Runaway token spend | Critical | Phase D budget_policies pre-flight |
| Agency migration data loss | High | Non-destructive backfill; default agency per tenant |
| Service-role blast radius | Critical | Per-workspace rate limits (Phase F) |
| Stale FinOps MVs | Medium | Hourly REFRESH cron in worker |

---

## Success Criteria (Phase A–B exit)

- [ ] Leadership decisions recorded for Inngest, Langfuse, agency schema
- [ ] Dify apps published; `npm run ai:verify` passes
- [x] Campaign POST returns 202 + pollable job status
- [x] Marketing event consumers active in production worker
- [x] MemoryRepository returns learnings in workflow
- [x] Optimizer produces learning row from campaign outcome
- [x] `ai_cmo_cost_ledger` receives rows from agent calls
- [ ] Test suite ≥ 94 passing; no Feature 003 regression
- [ ] `schema:verify:004` remains 11/11 (plus new migrations as added)

---

## Leadership Decisions Required

| Decision | Options | Audit recommendation | Status |
|----------|---------|---------------------|--------|
| Workflow orchestrator | Inngest vs Temporal vs custom+Redis | **Inngest** | Pending approval (CL-002) |
| LLM observability | Langfuse vs OTel-only vs Sentry AI | **Langfuse + OTel** | Pending approval |
| Agency hierarchy | Extend `tenants` vs new `agencies` table | **New `agencies` + migration** | Pending product sign-off |
| Dify role | Orchestrator vs runtime-only | **Runtime-only** | **Decided** (constitution) |

---

## Production Readiness Verdict

**Not ready for 5,000 workspaces** (audit assessment: runtime ~3.5/10, scale ~2/10). Minimum before scale build: Phases A–F complete; agency migration (Phase H) for 500-agency GTM.

See `architecture-audit/01-executive-audit.md` and `02-gap-analysis-matrix.md` for full issue register (43 issues) and prioritized gaps.
