# Feature Specification: AI CMO Master PRD v3.0

**Feature Branch:** `004-ai-cmo-master-prd-v3`  
**Created:** 2026-06-24 (speckit.specify refresh)  
**Version:** 3.0 + audit v3.1 adjustments  
**Status:** Sprint 12–13 complete · Sprint 14 partial · Phases F–H not started  
**Baseline:** [Feature 003 — Real Integrations](../003-real-integrations-production/spec.md) (link only—do not duplicate 003 requirements)  
**User stories:** [user-stories.md](./user-stories.md) (US-001–US-020)

**Input:** Autonomous AI Marketing Engine / AI CMO for agencies & enterprises (MENA + global), built on real publishing and analytics from Feature 003.

---

## 1. Product Vision (What We Want to Build)

Nexus Social **AI CMO** is an **autonomous marketing operating system**—not a chat sidebar on a scheduler. It orchestrates strategy, content creation, governance, publishing, measurement, learning, and portfolio optimization across **Tenant → Agency → Client Brand → Workspace → Campaign**, with Dify demoted to **agent runtime only** and durable orchestration in Inngest (or approved equivalent).

### Problem

Agencies and enterprises need to 10× content velocity without 10× headcount, while meeting **MENA compliance** (UAE PDPL, Egypt DPL), **enterprise governance** (risk-based approval, audit trails), and **FinOps discipline** (token caps, attribution ROI). Generic AI tools lack SoR/SoI separation, closed-loop learning, and integration with real network publish/analytics.

### Target scale (PRD v3 + audit v3.1)

| Dimension | Target |
|-----------|--------|
| Workspaces | 5,000+ |
| Agencies | 500+ |
| AI assets / month | 100,000 |
| Regions | MENA-first + global |
| Uptime SLO | 99.9% |

### Personas

| Persona | Primary needs |
|---------|----------------|
| **Agency owner** | Multi-client hierarchy, white-label, billing isolation, portfolio ROI |
| **Marketing operator** | Fast campaign creation, reliable publish loop, channel performance |
| **Executive / CIO** | Governance, cost control, compliance sign-off, board explainability |
| **Client approver** | Simple approval inbox; no auto-publish without sign-off |
| **AI ops engineer** | Traces, DLQ, circuit breakers, SLO dashboards |

Detailed journeys: [user-stories.md](./user-stories.md).

### Strategic principles

1. **SoR/SoI:** Agents never write SoR directly; all writes via `src/lib/sync/reconciler.ts`.
2. **Event-driven:** Marketing event bus → durable orchestration replanning.
3. **Risk-based governance:** Policy blocks regardless of LLM confidence.
4. **Closed-loop learning:** Decision → outcome → lesson → Brain retrieval.
5. **Portfolio-aware:** Executive layer handles cross-brand tradeoffs (Phase G).
6. **003 foundation:** OAuth, publish worker, analytics ingestion are prerequisites—not re-specified here.

### Success metrics (v3.1 revised)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Content output velocity | +500% @ 100 assets/ws/mo | `ai_cmo_content_pieces` count |
| Time-to-campaign | &lt; 15 min async (p95) | Workflow duration |
| Agent latency (p95) | &lt; 30 s | OTel (Phase F) |
| Reconciler latency (p99) | &lt; 100 ms | OTel |
| Policy violation auto-publish (CRITICAL) | 0% | Audit log |
| Platform uptime | 99.9% | SLO dashboard |
| Cost per asset | &lt; $0.08 avg | FinOps ledger |
| Closed-loop campaigns | 80% active measured | Outcomes populated |
| Learning validation rate | &gt; 70% | Human validated / total |

**Audit-adjusted maturity (2026-06-23):** Design **8.5/10** · Runtime **~35%** · Scale readiness **~20%** pre-Phase B–H.

---

## 2. Current State — What We HAVE Built (Honest)

Mapped to implemented code and migrations. **107 automated tests passing** (31 files, vitest 2026-06-24).

### Feature 003 baseline (linked—not duplicated)

| Area | Status | Evidence |
|------|--------|----------|
| OAuth (Meta, LinkedIn, X) | **Implemented** | `src/lib/oauth/` |
| Publish worker + adapters | **Implemented** | `src/bin/worker.ts`, `src/lib/publishers/` |
| Analytics ingestion (6h sync) | **Implemented** | `src/jobs/sync-analytics.ts` |
| Schema verify 003 | **18/18** | `npm run schema:verify` |
| Launch checklist | **56/62 tasks**; UAT + Meta Review open | [003 tasks](../003-real-integrations-production/tasks.md), `LAUNCH_CHECKLIST.md` |

### Feature 004 — Sprint 12 (Foundation) — **Complete**

| Deliverable | Status | Code / migration |
|-------------|--------|------------------|
| Productization hierarchy | **Done** | `20260624_000011_ai_cmo_hierarchy.sql` — `tenants`, `brands`, `ai_cmo_campaigns` |
| Event bus | **Done** | `src/lib/events/marketing-event-bus.ts` |
| SoR/SoI reconciler | **Done** | `src/lib/sync/reconciler.ts` |
| Orchestration skeleton | **Done** | `src/lib/orchestration/` (Inngest stub) |
| Memory / FinOps / attribution / eval schemas | **Done** | `20260624_000012_ai_cmo_foundation.sql` |
| Policy + quality engines | **Done** | `policy-engine.ts`, `content-quality-engine.ts`, `calibrated-confidence.ts` |
| Schema verify 004 | **11/11** | `npm run schema:verify:004` |

### Feature 004 — Sprint 13 (Core value) — **Complete** (code)

| Deliverable | Status | Code |
|-------------|--------|------|
| Dify runtime client | **Done** | `src/lib/dify/client.ts` |
| Strategic Brain agent | **Done** | `src/lib/ai-cmo/strategic-brain.ts` |
| Creator agent | **Done** | `src/lib/ai-cmo/creator-agent.ts` |
| Calibrated confidence API | **Done** | `/api/v1/ai-cmo/confidence` |
| Persona explainability | **Done** | `src/lib/explainability/renderer.ts` |
| Reconciler write path | **Done** | `src/lib/ai-cmo/campaign-service.ts` |
| Campaign API | **Done** | `POST/GET /api/v1/ai-cmo/campaigns` |
| Event consumers (stub replan) | **Done** | `marketing-event-consumers.ts` |
| Dify app publish (operator) | **Open** | S13-T012 — `npm run ai:verify` |

### Feature 004 — Sprint 14 partial (Phase B–E skeleton)

| Deliverable | Status | Code |
|-------------|--------|------|
| Async campaign API (202 + poll) | **Done** | `campaign-job-store.ts`, `campaigns/jobs/[jobId]` |
| Marketing event worker + Redis DLQ | **Done** | `marketing-event-worker.ts`, `marketing-event-dlq.ts` |
| MemoryRepository read path | **Done** | `memory-repository.ts` |
| Optimizer skeleton | **Done** | `optimizer-agent.ts` (no production cron loop) |
| FinOps cost writes + budget stub | **Done** | `cost-ledger.ts`, `budget-policy.ts` |
| Eval/confidence persistence in workflow | **Done** | `campaign-workflow-deps.ts` |
| Migration 000013 draft | **Draft only** | Not applied to Supabase |
| Migration 000014 agencies draft | **Draft only** | Not applied |

### NOT built (explicit)

| Item | Phase / sprint | Notes |
|------|----------------|-------|
| **Inngest** durable orchestration | Phase A/B | CL-002; Redis worker fallback active |
| **Langfuse** + OTel baseline | Phase F | Pending leadership approval |
| **Agency layer** migration 000014 | Phase H | `agencies` table not applied |
| **Optimizer full loop** | Phase C | No outcome ingestion job; no cron trigger |
| **Campaign → `post_id`** publish link | Phase B | B-ORCH-007 open |
| **Attribution ingestion + MV refresh** | Phase D | Schema only |
| **Human approval queue** | Phase E | Table + UI not built |
| **LLM-as-Judge** | Phase E | Schema only |
| **Programmatic SEO at scale** | Post-S15 | EEAT/cannibalization gates partial in engine only |
| **Phase F–H** | Observability, agent mesh, DR, hierarchy UI | Not started |
| **5 of 8 PRD agents** | Radar, Quant, Finance, Channel Risk, Compliance (full) | Only Brain + Creator production-ready |

---

## 3. What We WANT to Build — Requirements

Functional requirements use **FR-001+** scoped to Feature 004. Non-functional use **NFR-001+**. Full acceptance detail in [user-stories.md](./user-stories.md).

### 3.1 Orchestration (Module A, Q)

| ID | Requirement | Status |
|----|-------------|--------|
| FR-001 | System MUST run campaign workflows asynchronously with 202 + pollable job ID; no HTTP request blocks &gt; 30 s | **Partial** — Redis async done; Inngest not installed |
| FR-002 | System MUST port `runCampaignWorkflow` to durable steps with retries (3) and idempotent side effects | **Not built** — blocked A-GATE-001 |
| FR-003 | System MUST persist failed orchestration jobs to DLQ (Postgres or Redis) with zero silent drops after max retries | **Partial** — Redis DLQ only |
| FR-004 | System MUST register marketing event consumers in production `worker.ts` | **Done** |
| FR-005 | System MUST bridge event bus signals (underperforming, budget breach) to replan orchestration | **Partial** — callback stub; no Inngest bridge |
| FR-006 | System MUST deprecate legacy BRPOP `queue:ai-orchestration` once Inngest is live | **Not built** |
| FR-007 | System MUST link `ai_cmo_campaigns.post_id` to Feature 003 `posts` via reconciler only | **Not built** |
| FR-008 | System MUST treat Dify as agent runtime only—not workflow orchestrator (CL-005) | **Done** — design enforced |

### 3.2 Memory & learning (Modules B, W, J)

| ID | Requirement | Status |
|----|-------------|--------|
| FR-009 | System MUST implement `MemoryRepository` retrieving ranked learnings per workspace/brand | **Partial** — read path wired |
| FR-010 | System MUST ingest `post_analytics` → `ai_cmo_campaign_outcomes` within 48 h of publish | **Not built** |
| FR-011 | System MUST run Optimizer agent on completed campaigns to write validated learnings | **Partial** — skeleton only |
| FR-012 | System MUST apply migration 000013 (decision ledger, experiments, agent_decisions) | **Draft** — not applied |
| FR-013 | System MUST write strategy history from Brain and Optimizer via reconciler | **Not built** |
| FR-014 | System MUST support optional Qdrant hybrid retrieval for learnings (L3) | **Not built** |
| FR-015 | System MUST scrub PII before persisting `ai_cmo_learnings.context` | **Not built** |

### 3.3 Governance & quality (Modules C, D, L, I)

| ID | Requirement | Status |
|----|-------------|--------|
| FR-016 | System MUST enforce risk-based policy routing independent of confidence score | **Partial** — 6 rules; regex on JSON |
| FR-017 | System MUST never auto-publish CRITICAL risk tier content | **Partial** — needs approval queue hard gate |
| FR-018 | System MUST expand MENA PDPL / Egypt DPL policy ruleset beyond baseline | **Not built** |
| FR-019 | System MUST provide `ai_cmo_approval_requests` with SLA, assignee, status API | **Not built** |
| FR-020 | System MUST run LLM-as-Judge post-Creator and persist to `ai_cmo_evaluations` | **Not built** |
| FR-021 | System MUST persist calibrated confidence + band on every generation | **Partial** — workflow deps |
| FR-022 | System MUST expose persona-specific explainability (executive, operator, compliance) | **Done** |
| FR-023 | System MUST apply structured `ContentPiece` extraction for policy (not `JSON.stringify`) | **Not built** |

### 3.4 Agents (Module mesh — L5)

| ID | Requirement | Status |
|----|-------------|--------|
| FR-024 | Strategic Brain MUST produce structured plan JSON (horizon, channels, KPIs) via Dify + fallback | **Done** |
| FR-025 | Creator MUST produce platform-specific content from approved strategy | **Done** |
| FR-026 | Radar agent MUST emit competitor/trend signals to event bus | **Not built** |
| FR-027 | Channel Risk agent MUST score platform policy and CPM volatility | **Not built** |
| FR-028 | Optimizer agent MUST close decision → outcome → lesson loop | **Partial** |
| FR-029 | Finance agent MUST tie spend to Stripe pipeline and portfolio caps | **Not built** |
| FR-030 | Quant agent MUST provide statistical scenario modeling | **Not built** |
| FR-031 | Portfolio S&OP agent MUST recommend cross-brand budget tradeoffs | **Not built** |

### 3.5 FinOps & attribution (Modules E, F, O)

| ID | Requirement | Status |
|----|-------------|--------|
| FR-032 | System MUST log every agent call tokens/cost to `ai_cmo_cost_ledger` | **Partial** — Brain/Creator hooked |
| FR-033 | System MUST ingest attribution events (UTM, webhooks) to `ai_cmo_attribution_events` | **Not built** |
| FR-034 | System MUST refresh cost and attribution materialized views on schedule (hourly) | **Not built** |
| FR-035 | System MUST enforce `budget_policies` pre-flight at orchestration step 0 | **Partial** — stub if table missing |
| FR-036 | System MUST block workflow start when workspace exceeds budget cap | **Partial** — stub |
| FR-037 | System MUST provide unified cost view joining 003 `ai_credit_ledger` and 004 cost ledger | **Not built** |
| FR-038 | System MUST enforce workspace model allowlist for OpenRouter fallback | **Not built** |

### 3.6 Observability (Module N, Phase F)

| ID | Requirement | Status |
|----|-------------|--------|
| FR-039 | System MUST emit OTel traces from API, worker, and agent calls | **Not built** |
| FR-040 | System MUST integrate Langfuse for LLM trace inspection | **Not built** |
| FR-041 | System MUST surface agent errors to Sentry with workspace context | **Not built** |
| FR-042 | System MUST provide `/admin/ai-ops` dashboard (latency, cost, violations, DLQ) | **Not built** |
| FR-043 | System MUST apply per-workspace rate limits on reconciler service-role writes | **Not built** |
| FR-044 | System MUST implement circuit breakers on Dify/OpenRouter with fallback | **Not built** |

### 3.7 SEO (Module D extended — Phase post-S15)

| ID | Requirement | Status |
|----|-------------|--------|
| FR-045 | System MUST enforce EEAT quality gate before SEO content publish | **Partial** — engine exists; not wired to SEO scale |
| FR-046 | System MUST detect content cannibalization across brand corpus | **Not built** |
| FR-047 | System MUST support programmatic landing page generation with uniqueness checks | **Not built** |

### 3.8 Multi-tenant productization (Module K)

| ID | Requirement | Status |
|----|-------------|--------|
| FR-048 | System MUST support Tenant → Agency → Client Brand → Workspace → Campaign hierarchy | **Partial** — no `agencies` table |
| FR-049 | System MUST apply migration 000014 with non-destructive backfill | **Draft only** |
| FR-050 | System MUST provide hierarchy UI (tenant/agency/brand picker) | **Not built** |
| FR-051 | System MUST inject `brands.name` and `brand_voice_config` into all agent outputs | **Not built** |
| FR-052 | System MUST enforce RLS across `ai_cmo_strategies` and agency-scoped reads | **Partial** — policies exist; CI test gap |

### 3.9 Disaster recovery (Module M, Phase F/H)

| ID | Requirement | Status |
|----|-------------|--------|
| FR-053 | System MUST document RTO/RPO and run annual DR tabletop | **Not built** |
| FR-054 | System MUST support reconciler replay from audit log after partial failure | **Not built** |
| FR-055 | System MUST deploy Redis HA / stream partitioning for marketing events at scale | **Not built** |

### 3.10 Non-functional requirements

| ID | Requirement | Status |
|----|-------------|--------|
| NFR-001 | All tenant-scoped tables MUST have RLS; no cross-workspace reads | **Done** — 000011/000012 |
| NFR-002 | Reconciler MUST be sole write path for agent-originated SoR mutations | **Done** |
| NFR-003 | Platform MUST target 99.9% uptime for API + worker paths | **Not measured** |
| NFR-004 | Agent p95 latency MUST remain &lt; 30 s under 100 concurrent campaigns | **Not verified** |
| NFR-005 | Reconciler p99 latency MUST remain &lt; 100 ms | **Not measured** |
| NFR-006 | Policy violation rate on CRITICAL auto-publish MUST be 0% | **Partial** — no approval queue |
| NFR-007 | GDPR: data export and deletion for memory tables | **Not built** |
| NFR-008 | UAE PDPL: data residency flag per tenant + routing | **Not built** |
| NFR-009 | Egypt DPL: locale-specific compliance templates | **Not built** |
| NFR-010 | Audit log retention: 7-year archive path for enterprise tier | **Not built** |
| NFR-011 | No `any` in production TypeScript; 107+ unit tests on critical paths | **Done** — 107 tests |
| NFR-012 | Feature 003 publish/analytics MUST not regress when 004 ships | **Ongoing** — convergence rule |

**Requirement counts:** **55 FR** + **12 NFR** = **67 total**  
**FR implemented (full or partial):** **22** (~40% of FRs have some code) · **FR fully done:** **~12** (~22%)  
**Runtime completeness (audit modules A–W):** **~35%**  
**NFR met:** **4/12** (~33%)

---

## 4. User Stories

Twenty user stories (US-001–US-020) with acceptance scenarios, persona index, and edge cases are maintained in **[user-stories.md](./user-stories.md)** to keep this spec navigable.

**Summary by priority:**

| Priority | Count | Themes |
|----------|-------|--------|
| P1 | 4 | Campaign creation, governance, publish loop, client approval |
| P2 | 6 | Learning loop, ROI, spend controls, explainability, replanning, AI ops |
| P3 | 10 | Hierarchy, white-label, billing, S&OP, compliance, SEO, DR, Radar, Channel Risk, Judge |

---

## 5. Out of Scope — Next 2 Sprints (Sprint 14 + Sprint 15)

Explicit **not building** in Sprint 14 and Sprint 15 planning horizon:

| Item | Reason |
|------|--------|
| Inngest install + production functions | Blocked A-GATE-001 unless leadership approves mid-sprint |
| Langfuse / full OTel stack | Phase F; blocked A-GATE-002 |
| Agency migration 000014 + hierarchy UI | Phase H; blocked A-GATE-003 |
| Optimizer **full** closed loop (outcomes cron + Qdrant) | Phase C tail; depends on `post_id` + outcome job |
| Programmatic SEO at scale (100+ pages/batch) | Post-S15; EEAT/cannibalization not production-hardened |
| Phase F–H deliverables | AI Ops dashboard, circuit breakers, DR tabletop, load test 5k WS |
| Agent mesh (Radar, Quant, Finance, Sentinel production) | Phase G — Sprint 15 starts intel only if B–E exit |
| Mobile AI CMO app | Parallel track only |
| Net-new social networks beyond 003 OAuth | 003 scope |
| Replacing Activepieces for non-marketing automation | Platform boundary |
| On-prem LLM inference | Future enterprise |

**In scope for Sprint 14–15 (when gates clear):** async orchestration hardening, `post_id` wiring, migration 000013 apply, outcome ingestion, budget policies runtime, attribution ingestion, approval queue MVP, LLM-as-Judge baseline, Radar/Channel Risk stubs.

---

## 6. Traceability Table

| User Story | Requirement(s) | Sprint / Phase | Task ID | Status |
|------------|----------------|----------------|---------|--------|
| US-001 | FR-001, FR-024, FR-025 | Sprint 13–14 | S13-T002, S13-T003, S14-T008 | **Done** (async); Inngest open |
| US-002 | FR-016, FR-017, FR-018 | Sprint 12–13 / E | T009, E-GOV-003 | **Partial** |
| US-003 | FR-007 | Phase B | B-ORCH-007, S14-T002 | **Open** |
| US-004 | FR-019, FR-020 | Phase E | E-GOV-001, E-GOV-008 | **Open** |
| US-005 | FR-009–FR-011, FR-028 | Phase C | C-MEM-003, C-MEM-004, S14-T005 | **Partial** |
| US-006 | FR-032–FR-034 | Phase D | D-FIN-004, D-FIN-005, S14-T007 | **Open** |
| US-007 | FR-035, FR-036, FR-037 | Phase D | D-FIN-001, D-FIN-003, S14-T006 | **Partial** |
| US-008 | FR-021, FR-022 | Sprint 13 | S13-T004, S13-T005, S14-T009 | **Done** / partial persist |
| US-009 | FR-004–FR-006 | Sprint 14 / B | S14-T003, B-ORCH-004, B-ORCH-005 | **Partial** |
| US-010 | FR-039–FR-044 | Phase F | F-OBS-001–F-OBS-008 | **Open** |
| US-011 | FR-048–FR-050 | Phase H | H-PROD-001, H-PROD-002, A-GATE-003 | **Partial** schema |
| US-012 | FR-051 | Phase H | H-PROD-003 | **Open** |
| US-013 | FR-037, FR-038 | Phase D | D-FIN-006 | **Open** |
| US-014 | FR-030, FR-031 | Phase G | G-AGENT-006 | **Open** |
| US-015 | FR-018, FR-023, NFR-008, NFR-009 | Phase E | E-GOV-003, A-GATE-005 | **Partial** |
| US-016 | FR-045–FR-047 | Post-S15 | — | **Open** |
| US-017 | FR-053–FR-055 | Phase F/H | H-PROD-006 | **Open** |
| US-018 | FR-026 | Phase G | G-AGENT-001, S15-T001 | **Open** |
| US-019 | FR-027 | Phase G | G-AGENT-002, S15-T002 | **Open** |
| US-020 | FR-020, FR-021 | Phase E | E-GOV-004 | **Open** |
| *(003 OAuth)* | *(003 FR-001)* | Phase 1 | T053 | **Open** UAT |
| *(003 publish)* | *(003 FR-002)* | Phase 1 | T024, T055 | **Partial** |
| *(Dify publish)* | FR-024 | Phase A | S13-T012, A-GATE-004 | **Open** operator |

---

## 7. Architecture Summary (condensed)

### 9-layer model (audit v3.1)

```text
L1  Dashboard & Management Interface
L2  API Gateway & Edge
L3  Orchestration (Inngest target; Redis worker today)
L4  Policy & Governance
L5  Memory & Intelligence
L6  Agent Mesh (Dify runtime)
L7  Execution & Reconciler (+ 003 publish worker)
L8  Observability & FinOps
L9  Learning Loop (Optimizer)
```

### Module catalog (A–W) — runtime snapshot

| Module | Name | Runtime status |
|--------|------|----------------|
| A | Orchestration | Stub + Redis async (~40%) |
| B | Memory | Schema + partial repo (~30%) |
| C | Policy | Engine + 6 rules (~50%) |
| D | Quality | Engine (~40%) |
| E | FinOps | Schema + partial writes (~35%) |
| F | Attribution | Schema only (~15%) |
| G | Optimizer | Skeleton (~20%) |
| P | Reconciler | Insert path (~65%) |
| Q | Event Bus | Publish + partial consume (~50%) |
| S | Calibrated confidence | API + partial persist (~70%) |
| U | Explainability | UI panel (~80%) |
| K | Hierarchy | 000011 only (~40%) |

Full audit: [architecture-audit/README.md](./architecture-audit/README.md).

### Migration status (2026-06-24)

| Migration | Applied | Tables |
|-----------|---------|--------|
| `20260624_000011_ai_cmo_hierarchy.sql` | **Yes** | `tenants`, `brands`, `ai_cmo_campaigns`, `workspaces.tenant_id` |
| `20260624_000012_ai_cmo_foundation.sql` | **Yes** | memory, FinOps, attribution, evaluations, `ai_cmo_strategies` |
| `20260624_000013_*` (draft) | **No** | decision ledger, experiments, budget_policies |
| `20260624_000014_*` (draft) | **No** | `agencies` hierarchy |

```powershell
npm run schema:verify      # 003 — 18/18
npm run schema:verify:004  # 004 — 11/11
npm test                   # 107 passed
```

---

## 8. Sprint Status

| Sprint | Focus | Status |
|--------|--------|--------|
| **12** | Foundation | **Complete** |
| **13** | Brain, Creator, confidence, explainability | **Complete** (code); S13-T012 Dify publish pending |
| **14** | Orchestration, memory, FinOps, eval baseline | **Partial** (~40% of sprint tasks) |
| **15** | External intel, governance hardening | Planned |
| **16** | AI Ops, Compliance, agency prep | Planned |
| **17** | Hierarchy UI, launch hardening | Planned |

Phases A–H detail: [implementation-plan.md](./implementation-plan.md), [IMPLEMENT_PLAN_ALL_OPEN.md](./IMPLEMENT_PLAN_ALL_OPEN.md).

---

## 9. References

| Document | Path |
|----------|------|
| User stories | [user-stories.md](./user-stories.md) |
| Tasks | [tasks.md](./tasks.md) |
| Sprint plan | [plan.md](./plan.md) |
| Gap register | [analysis.md](./analysis.md) |
| Clarifications | [clarifications.md](./clarifications.md) |
| 003/004 convergence | [convergence.md](./convergence.md) |
| Constitution | [constitution.md](./constitution.md) |
| Implementation plan | [implementation-plan.md](./implementation-plan.md) |
| Open work master | [IMPLEMENT_PLAN_ALL_OPEN.md](./IMPLEMENT_PLAN_ALL_OPEN.md) |
| Architecture audit | [architecture-audit/README.md](./architecture-audit/README.md) |
| Feature 003 (baseline) | [../003-real-integrations-production/spec.md](../003-real-integrations-production/spec.md) |
| Launch checklist | [../../LAUNCH_CHECKLIST.md](../../LAUNCH_CHECKLIST.md) |

---

## Assumptions

- Feature 003 OAuth and publish worker remain the execution layer for live network posts.
- Leadership approves Inngest before durable orchestration replaces Redis-only fallback.
- Dify apps published by operator; OpenRouter fallback acceptable until S13-T012 complete.
- Agency hierarchy uses new `agencies` table (Option B per audit)—not tenant-type enum alone.
- MENA compliance baseline ships in Phase E; full data residency routing requires tenant `data_region`.
