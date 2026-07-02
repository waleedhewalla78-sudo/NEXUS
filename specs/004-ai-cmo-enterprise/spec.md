# Feature 004: AI CMO Enterprise — Authoritative Specification

**Feature directory:** `specs/004-ai-cmo-enterprise/`  
**Status:** Production-ready (Phases 0–8 complete)  
**Maturity assessment:** 9.7/10 enterprise SaaS  
**Active Speckit track:** Feature **003** (unchanged) — this document is the authoritative handoff for Feature 004  
**Baseline dependency:** [Feature 003 — Real Integrations Production](../003-real-integrations-production/spec.md)

---

## Executive Summary

Feature **004 (Nexus Social AI CMO)** extends Feature 003 with an autonomous marketing intelligence layer. It adds durable async orchestration (Inngest), an 8-agent mesh, closed-loop memory and optimization, enterprise governance (policy engine, approval queue, PII scrubbing), FinOps cost controls, agency hierarchy with geographic data residency, and vendor-resilient LLM routing.

**004 extends 003 — it does not replace it.** OAuth, publish workers, `post_analytics`, and the 003 reconciler remain prerequisites and are never modified destructively.

---

## 9-Layer Architecture

| Layer | Name | 004 Implementation |
|-------|------|-------------------|
| **L1** | Dashboard | Nexus UI + AI CMO campaign surfaces |
| **L2** | API Gateway | `/api/v1/ai-cmo/*`, `/api/inngest` |
| **L3** | Orchestration | **Inngest** — durable workflows, cron jobs, event bridge from 003 Redis |
| **L4** | Policy & Governance | `policy-engine-v2`, approval queue, PII scrubber, data residency |
| **L5** | Memory & Intelligence | `MemoryRepository`, Qdrant hybrid search, learnings, outcomes |
| **L6** | Agent Mesh | 8 agents via `ProviderRouter` (Dify → OpenRouter fallback) |
| **L7** | Execution / SoR | 003 `reconciler.ts` wrapped by `secure-reconciler-writer.ts` |
| **L8** | Observability & FinOps | Langfuse traces, OTel spans, cost ledger, budget guard |
| **L9** | Learning Loop | Optimizer agent + event-driven replan on underperformance |

### Constitution (non-negotiable)

1. **SoR/SoI boundary:** Agents propose (L6); only the reconciler persists (L7). All `ai_cmo_*` writes go through `secureSyncToSoR` / `securePatchSoR`.
2. **Risk tier > confidence:** CRITICAL/HIGH policy hits never auto-publish regardless of LLM score.
3. **003 isolation:** `src/lib/sync/reconciler.ts` is never modified. Migrations are additive only.
4. **PII fail-safe:** JSONB destined for memory tables is scrubbed before insert (Issue #18).

---

## Inngest Event Flow

All events use the `ai-cmo/` namespace (defined in `src/lib/orchestration/types/events.ts`).

### Registered Inngest Functions

| Function ID | Trigger | Purpose |
|-------------|---------|---------|
| `campaign-workflow` | `ai-cmo/campaign.requested` | Full campaign pipeline (plan → generate → evaluate → publish) |
| `trigger-replan` | `ai-cmo/campaign.underperforming` | Optimizer → persist learnings |
| `outcome-ingestion` | Cron `0 2 * * *` | Sync 003 `post_analytics` → `ai_cmo_campaign_outcomes` |
| `mv-refresh` | Cron `0 * * * *` | Refresh FinOps materialized views |

### Campaign Workflow Step Order

```
finops-preflight
  → plan (Strategic Brain)
  → retrieve-memory
  → generate (Creator)
  → check-uniqueness (SEO cannibalization guard, >70% similarity = reject)
  → structured-policy-review
  → evaluate (LLM-as-Judge, 8 dimensions)
  → revise-content (optional, 1 retry)
  → evaluate-retry
  → persist (reconciler)
  → link-post (003 publish path)
```

### Closed-Loop Replan Flow

```
003 Redis: marketing.campaign.underperforming
  → redis-to-inngest bridge
  → ai-cmo/campaign.underperforming
  → trigger-replan Inngest function
  → OptimizerAgent.run()
  → secureSyncToSoR → ai_cmo_learnings
```

---

## 8-Agent Mesh (L6)

| Agent | Module | Role |
|-------|--------|------|
| Strategic Brain | `strategic-brain.ts` | Campaign planning |
| Creator | `creator-agent.ts` | Content generation + revision |
| Optimizer | `agents/optimizer-agent.ts` | Outcome variance → learning proposals |
| Radar | `agents/radar-agent.ts` | Signal detection |
| Quant | `agents/quant-agent.ts` | Metrics analysis |
| Sentinel | `agents/sentinel-agent.ts` | Anomaly detection |
| Finance | `agents/finance-agent.ts` | Budget/cost signals |
| Compliance | `agents/compliance-agent.ts` | Policy pre-checks |

Registry: `src/lib/ai-cmo/agents/registry.ts`  
All LLM calls route through `src/lib/ai/providers/provider-router.ts` (vendor lock-in prevention).

---

## Quality & Governance Pipeline

### LLM-as-Judge (8 dimensions)

Accuracy, brand alignment, localization, uniqueness, EEAT, engagement, platform compliance, safety.

**Hard auto-reject rules:**
- Hallucination flag / safety < 0.5
- Overall score < 0.55
- Arabic locales (`ar-*`) with localization < 0.75
- Uniqueness < 0.70 (Doc 07)

### SEO Cannibalization Guard

Pre-check before LLM-as-Judge: compares new caption against last 50 workspace posts. Cosine similarity > 0.70 → reject.

Module: `src/lib/ai-cmo/quality/uniqueness-guard.ts`

### PII Scrubbing (Phase 8)

Automatic scrub on reconciler writes to:
- `ai_cmo_learnings` (`context`, `action`, `outcome`)
- `ai_cmo_agent_decisions` (`input_summary`, `output`)
- `ai_cmo_strategy_history` (`previous_state`, `new_state`)

Module: `src/lib/governance/pii-scrubber.ts` (wired in `secure-reconciler-writer.ts`)

---

## Agency Hierarchy (Phase 5)

```
Tenant → Agency → Client Brand (brands.agency_id)
```

- Data residency: `tenants.data_region` (`eu` | `mena` | `us`)
- Optimistic concurrency: `ai_cmo_campaigns.version`
- RLS: agency-scoped SELECT policies on agencies, brands, campaigns

Schema: `src/lib/db/schemas/agency-hierarchy.ts`  
Migration: `supabase/migrations/20260624_000014_agencies_hierarchy.sql`

---

## Phase 0–8 Directory Map

```
nexus-social-app/src/
├── lib/
│   ├── ai/
│   │   └── providers/              # Phase 6 — ModelProvider, Dify/OpenRouter, ProviderRouter
│   ├── ai-cmo/
│   │   ├── strategic-brain.ts      # L6 planning
│   │   ├── creator-agent.ts        # L6 content
│   │   ├── agents/                 # Phase 7 — 8-agent mesh + Optimizer
│   │   ├── memory/                 # L5 MemoryRepository, Qdrant stub
│   │   ├── quality/                # LLM-as-Judge, uniqueness guard
│   │   ├── utils/
│   │   │   └── secure-reconciler-writer.ts  # Phase 0/5/8 — rate limit, OCC, PII scrub
│   │   └── campaign-service.ts     # Reconciler-facing persistence helpers
│   ├── governance/
│   │   ├── policy-engine-v2.ts     # Phase 3 structured policy
│   │   ├── approval-service.ts     # Human approval queue
│   │   ├── pii-scrubber.ts         # Phase 8 GDPR/PDPL
│   │   └── data-residency.ts       # Phase 5 geographic compliance
│   ├── finops/
│   │   ├── cost-middleware.ts      # Phase 3 agent cost tracking
│   │   └── budget-guard.ts         # Pre-flight budget check
│   ├── orchestration/
│   │   ├── inngest-client.ts       # L3 client
│   │   ├── inngest-functions.ts    # Function registry aggregator
│   │   ├── bridge/redis-to-inngest.ts  # Phase 1 — 003 Redis → 004 Inngest
│   │   ├── workflows/
│   │   │   ├── inngest-campaign-workflow.ts
│   │   │   └── event-replan-workflow.ts   # Phase 6
│   │   └── types/events.ts
│   ├── observability/
│   │   ├── langfuse-client.ts      # Trace export + PII scrub on traces
│   │   └── trace-wrapper.ts        # OTel integration
│   ├── resilience/
│   │   └── circuit-breaker.ts      # Phase 4 Dify/OpenRouter protection
│   └── db/
│       ├── schemas/ai-cmo-phase-2.ts
│       └── schemas/agency-hierarchy.ts
├── jobs/ai-cmo/
│   ├── outcome-ingestion.ts        # Daily analytics sync
│   ├── mv-refresh.ts               # Hourly FinOps MV refresh
│   └── refresh-mvs.ts              # RPC wrapper
└── app/api/inngest/route.ts        # Inngest serve endpoint

supabase/migrations/
├── 20260624_000012_ai_cmo_foundation.sql   # Prerequisite
├── 20260624_000013_ai_cmo_sprint14_draft.sql
├── 20260624_000014_agencies_hierarchy.sql
└── RUN_IN_SQL_EDITOR_004_FINAL.sql         # Combined 000013 + 000014
```

---

## Required Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `INNGEST_EVENT_KEY` | Yes (prod) | Inngest event authentication |
| `INNGEST_SIGNING_KEY` | Yes (prod) | Inngest webhook verification |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Admin client for MV refresh, workers |
| `REDIS_URL` | Yes | Rate limiting, circuit breakers, job store |
| `DIFY_BASE_URL` | Recommended | Primary LLM runtime |
| `DIFY_API_KEY` | Recommended | Global Dify key (workspace override in DB) |
| `OPENROUTER_API_KEY` | Recommended | Fallback LLM provider |
| `LANGFUSE_PUBLIC_KEY` | Recommended | AI ops tracing |
| `LANGFUSE_SECRET_KEY` | Recommended | AI ops tracing |
| `LANGFUSE_BASE_URL` | Optional | Default: `https://cloud.langfuse.com` |
| `QDRANT_URL` | Optional | Hybrid vector memory |
| `QDRANT_API_KEY` | Optional | Qdrant auth |
| `MARKETING_EVENTS_STREAM_KEY` | Optional | 003 Redis stream (default: `marketing:events`) |

---

## Database Migrations (Production Order)

1. `20260624_000012_ai_cmo_foundation.sql` — core `ai_cmo_*` tables
2. `20260624_000013_ai_cmo_sprint14_draft.sql` — decision ledger, experiments, approval queue, MV RPC
3. `20260624_000014_agencies_hierarchy.sql` — agencies, data residency, OCC

Or run combined: `RUN_IN_SQL_EDITOR_004_FINAL.sql` (requires 000012 first).

---

## Inherited from Feature 003 (do not duplicate)

- OAuth connect (Meta, LinkedIn, X)
- Scheduled publishing via `PublisherAdapter` + worker
- Analytics ingestion → `post_analytics`
- Schema CI gate and baseline migrations
- Multi-tenant RLS foundation

---

## Deployment Handoff

See [`nexus-social-app/docs/004-PRODUCTION-READINESS.md`](../nexus-social-app/docs/004-PRODUCTION-READINESS.md) for step-by-step DevOps instructions.

---

## Related Documents

- [quickstart.md](./quickstart.md) — local dev setup
- [plan.md](./plan.md) — Speckit implementation plan (V1.0 + post-launch)
- [tasks.md](./tasks.md) — Speckit task list
- [clarifications.md](./clarifications.md) — Resolved ambiguities
- [analysis.md](./analysis.md) — Cross-artifact consistency report
- [004 master PRD](../nexus-social-app/specs/004-ai-cmo-master-prd-v3/spec.md) — original FR/US inventory
- [Post-launch backlog](../nexus-social-app/docs/004-POST-LAUNCH-BACKLOG-S15-S17.md) — S15–17 Jira-ready stories
- [003 spec](../003-real-integrations-production/spec.md) — production baseline

---

## Speckit Scope — Built vs Planned

### V1.0 — Shipped (Phases 0–8)

| ID | Requirement | Status |
|----|-------------|--------|
| FR-001 | Async campaign orchestration (202 + poll) | ✅ |
| FR-002 | Inngest durable workflow | ✅ |
| FR-005 | Event-driven replan on underperformance | ✅ |
| FR-007 | Campaign → post link via reconciler | ✅ |
| FR-009–011 | Memory retrieval + Optimizer learnings | ✅ |
| FR-016–018 | Policy engine + risk tier gating | ✅ |
| FR-024–025 | Strategic Brain + Creator agents | ✅ |
| FR-033–034 | FinOps ledger + MV refresh | ✅ |
| SC-001 | Closed-loop autonomous optimization in code | ✅ |
| SC-002 | PII scrub on memory writes | ✅ |
| SC-003 | 003 reconciler never modified | ✅ |

### Post-Launch — Sprints 15–17 (Deferred)

| ID | Requirement | Gap | Sprint |
|----|-------------|-----|--------|
| FR-026 | Radar external signal ingestion | H5 | 15 |
| FR-027 | Channel risk heatmap | M6 | 15 |
| FR-028 | Full Qdrant hybrid memory | C6, L3 | 15 |
| FR-029 | Finance / Stripe ROI | M5 | 16 |
| FR-031 | Portfolio S&OP scenarios | M4 | 16 |
| FR-041 | AI Ops dashboard | H10 | 16 |
| FR-042 | Tenant/brand hierarchy UI | M9, M11 | 17 |
| FR-020 | Client approval inbox UI | US-004 UI | 17 |
| POST-SEC | Penetration test `/api/inngest` | new | 17 |
| POST-B | Enterprise IdP (SAML/SCIM) | new | 17 |

---

## User Stories (Speckit)

### US-001 — AI Campaign Creation (P1) ✅ V1.0

As a **marketing operator**, I want to submit a brief and receive strategy + content asynchronously, so that I can schedule campaigns without blocking HTTP.

**Acceptance:**
1. POST `/api/v1/ai-cmo/campaigns` → `202` + `jobId`
2. Poll resolves to `completed` with `campaignId` or `failed` with reason
3. Inngest steps: plan → generate → evaluate → persist → link-post

### US-002 — Risk-Based Governance (P1) ✅ V1.0

As an **executive**, I want CRITICAL policy hits to block auto-publish regardless of LLM score.

**Acceptance:**
1. `structured-policy-review` returns CRITICAL → `routeToApproval()` + job `failed`
2. No auto-publish when `riskTier === 'CRITICAL'`

### US-003 — Publish Closed Loop (P1) ✅ V1.0

As a **marketing operator**, I want campaigns linked to 003 `posts` and publish workers.

**Acceptance:**
1. `link-post` step sets `post_id` via reconciler
2. 003 `publish-due-posts` picks up scheduled post

### US-004 — Client Approval Inbox (P1) ⏳ Post-Launch

As a **client approver**, I want an inbox to approve/reject AI drafts.

**Acceptance:**
1. UI lists `ai_cmo_approval_requests` where `status = pending`
2. Approve/reject updates via reconciler only

**V1.0 partial:** Backend queue only (CL-004-002).

### US-005 — Closed-Loop Learning (P2) ✅ V1.0

As a **marketing operator**, I want Optimizer learnings from outcomes to improve future plans.

**Acceptance:**
1. `outcome-ingestion` cron populates `ai_cmo_campaign_outcomes`
2. Underperforming → bridge → `trigger-replan` → `ai_cmo_learnings`
3. `retrieve-memory` returns ranked learnings

### US-006 — FinOps Budget Control (P2) ✅ V1.0

As a **CIO**, I want campaigns blocked when monthly AI budget cap exceeded.

**Acceptance:**
1. `finops-preflight` throws `BudgetExceededError` → job rejected
2. Spend recorded in `ai_cmo_cost_ledger`

### US-007 — External Intelligence (P2) ⏳ Sprint 15

As a **marketing operator**, I want competitor/trend signals to inform strategy.

**Acceptance:**
1. Radar emits `ai-cmo/signal.detected` from real 003 listening data
2. Brain plan cites signal context when present

### US-008 — Anomaly Response (P2) ⏳ Sprint 16

As an **AI ops engineer**, I want metric anomalies to trigger Sentinel events.

**Acceptance:**
1. Sentinel detects ≥30% engagement drop vs baseline
2. Emits `ai-cmo/anomaly.detected` without SoR writes

### US-009 — True ROI Reporting (P2) ⏳ Sprint 16

As an **agency owner**, I want Finance agent ROI tied to billing data.

**Acceptance:**
1. Finance reads cost ledger + Stripe/billing refs
2. Returns ROAS/ROI proposal (no direct DB write)

### US-010 — Enterprise SSO (P3) ⏳ Sprint 17

As an **enterprise CIO**, I want SAML SSO for workspace access.

**Acceptance:**
1. SAML login path for enterprise tenants
2. API key auth unchanged for automation

### US-011 — Production Security Validation (P3) ⏳ Sprint 17

As an **AI ops engineer**, I want third-party pentest on Inngest + AI CMO APIs.

**Acceptance:**
1. Pentest report with Critical/High remediated
2. `/api/inngest` rejects unsigned payloads
