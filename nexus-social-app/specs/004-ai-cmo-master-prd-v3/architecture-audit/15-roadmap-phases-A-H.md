# Revised Roadmap — Phases A through H

**Date:** 2026-06-23 · **Replaces:** Sprint 14–17 plan ordering where conflicts exist  
**Prerequisite:** Sprint 12–13 complete (foundation + Brain/Creator)

---

## Phase Overview

| Phase | Name | Duration | Depends on |
|-------|------|----------|------------|
| **A** | Leadership gates & approvals | 1 week | Sprint 13 |
| **B** | Durable orchestration | 2–3 weeks | A |
| **C** | Memory & closed loop | 2–3 weeks | B |
| **D** | FinOps & attribution runtime | 2 weeks | B |
| **E** | Governance & quality hardening | 2–3 weeks | B, C partial |
| **F** | Observability & resilience | 2 weeks | B |
| **G** | Agent mesh expansion | 3–4 weeks | C, D |
| **H** | Productization & launch | 2–3 weeks | D, E, F, G partial |

**Total estimate:** 16–21 weeks post-approval (parallel tracks possible for D+F after B)

---

## Phase A — Leadership Gates

**Goal:** Unblock dependencies requiring approval.

| Task | Owner | Output |
|------|-------|--------|
| A1 | Engineering lead | Inngest approval + Cloud account |
| A2 | CIO | Langfuse self-host vs Cloud decision |
| A3 | Product | Agency hierarchy sign-off (000014) |
| A4 | Operator | Dify Brain + Creator publish (S13-T012) |
| A5 | Security | PDPL data flow review |

**Success metrics:** Written decision log; Inngest npm approved  
**Risks:** Approval delay stalls all downstream phases  

---

## Phase B — Durable Orchestration

**Goal:** Async campaigns, retries, event bridge, DLQ.

| Task | Artifact |
|------|----------|
| B1 | Install Inngest + `api/inngest/route.ts` |
| B2 | Port `campaign-workflow` to Inngest steps |
| B3 | Campaign API → 202 async |
| B4 | Worker registers marketing event consumers |
| B5 | Event bus → Inngest.send bridge |
| B6 | `ai_cmo_failed_jobs` + onFailure handler |
| B7 | Wire campaign → post via reconciler |
| B8 | Deprecate BRPOP ai-orchestration queue |

**Success metrics:** 100 concurrent campaigns; p95 workflow <5min; 0 lost jobs on worker restart  
**Risks:** Vercel timeout if sync path not removed (mitigated by B3)  
**Depends:** Phase A (Inngest approval)

---

## Phase C — Memory & Closed Loop

**Goal:** MemoryRepository, outcome ingestion, Optimizer, decision ledger.

| Task | Artifact |
|------|----------|
| C1 | Migration 000013 (decision_ledger, experiments, agent_decisions) |
| C2 | MemoryRepository + retrieveMemory wired |
| C3 | Outcome job: post_analytics → campaign_outcomes |
| C4 | Optimizer agent + Inngest cron |
| C5 | Qdrant learning index on store |
| C6 | Strategy history writes from Brain/Optimizer |

**Success metrics:** 80% active campaigns have outcomes within 48h; ≥1 learning per completed campaign  
**Risks:** Sparse analytics on new workspaces — cold-start prompts  
**Depends:** Phase B

---

## Phase D — FinOps & Attribution Runtime

**Goal:** Cost tracking, budgets, attribution ingestion.

| Task | Artifact |
|------|----------|
| D1 | Migration 000013 (budget_policies, token_usage) |
| D2 | Agent cost middleware → ledger |
| D3 | Pre-flight budget check (Inngest step 0) |
| D4 | MV refresh cron (cost + attribution) |
| D5 | Attribution event ingestion (UTM + webhooks) |
| D6 | Unified cost view MV |

**Success metrics:** 100% agent calls logged; 0 workflows start over cap  
**Risks:** Credit vs USD confusion — document in UI  
**Depends:** Phase B (can parallel with C after B1)

---

## Phase E — Governance & Quality Hardening

**Goal:** Risk tiers, approval queue, LLM-as-Judge, structured policy.

| Task | Artifact |
|------|----------|
| E1 | `ai_cmo_approval_requests` table + API |
| E2 | Structured ContentPiece extraction |
| E3 | Expand POLICY_RULES (MENA) |
| E4 | LLM-as-Judge evaluation job |
| E5 | 8-dimension schema extensions |
| E6 | Cannibalization + EEAT gates |
| E7 | Confidence persist on evaluations |
| E8 | Approval inbox UI (minimal) |

**Success metrics:** 0% CRITICAL auto-publish; Judge–human agreement >85%  
**Risks:** Approval queue backlog — SLA alerts  
**Depends:** Phase B; C4 helpful for learning from rejections

---

## Phase F — Observability & Resilience

**Goal:** OTel, Langfuse, circuit breakers, AI Ops dashboard.

| Task | Artifact |
|------|----------|
| F1 | OTel SDK (API + worker + agents) |
| F2 | Langfuse integration |
| F3 | Sentry agent error boundaries |
| F4 | `circuit-breaker.ts` on Dify/OpenRouter |
| F5 | `/admin/ai-ops` dashboard |
| F6 | Redis stream lag monitoring |
| F7 | SLO alerting rules |

**Success metrics:** MTTR <30min for P1; trace coverage 100% agent paths  
**Risks:** Langfuse PII — scrub pipeline  
**Depends:** Phase B; parallel with D

---

## Phase G — Agent Mesh Expansion

**Goal:** Radar, Quant, Sentinel, Finance, Channel Risk, Portfolio S&OP.

| Task | Artifact |
|------|----------|
| G1 | Radar → event bus integration |
| G2 | Channel Risk heatmap API |
| G3 | Quant agent (analytics interpretation) |
| G4 | Sentinel (anomaly on metrics) |
| G5 | Finance agent (Stripe pipeline) |
| G6 | Portfolio S&OP scenarios |
| G7 | Event-driven replan production |

**Success metrics:** Radar→replan latency <5min; 3+ agent types per campaign  
**Risks:** Agent cost multiplication — FinOps caps required first  
**Depends:** Phases C, D, F

---

## Phase H — Productization & Launch

**Goal:** Agency hierarchy, UI, E2E, DR drill, production gate.

| Task | Artifact |
|------|----------|
| H1 | Migration 000014 agencies |
| H2 | Tenant/agency/brand UI |
| H3 | White-label in explainability |
| H4 | Playwright AI CMO smoke E2E |
| H5 | LAUNCH_CHECKLIST extension |
| H6 | DR tabletop + Redis HA |
| H7 | Performance load test (500 concurrent ws) |
| H8 | Production readiness sign-off |

**Success metrics:** 500 workspace load test pass; DR RTO validated; launch checklist 100%  
**Risks:** Agency migration data issues — backfill scripts  
**Depends:** Phases D, E, F; G partial

---

## Dependency Graph

```text
Sprint 12–13 ✓
       │
       ▼
Phase A (gates)
       │
       ▼
Phase B (orchestration) ─────┬──────────────┐
       │                     │              │
       ├► Phase C (memory)    ├► Phase D     ├► Phase F
       │                     │   (FinOps)   │   (observability)
       │                     │              │
       └──────────┬──────────┴──────────────┘
                  │
                  ├► Phase E (governance)
                  │
                  ▼
            Phase G (agents)
                  │
                  ▼
            Phase H (launch)
```

---

## Risk Register (Roadmap)

| ID | Risk | Phase | Mitigation |
|----|------|-------|------------|
| RR-1 | Inngest not approved | A | Temporal eval or extended custom (not recommended) |
| RR-2 | Optimizer before outcomes | C | Enforce job ordering |
| RR-3 | Cost overrun during G | G | Phase D must complete first |
| RR-4 | Agency migration breaks RLS | H | Integration tests + nullable FK |
| RR-5 | 99.9% without Redis HA | H | Sentinel/Redis replica in H6 |

---

## Mapping to Legacy Sprints

| Legacy | Maps to |
|--------|---------|
| Sprint 14 | Phase B + C + D (core) |
| Sprint 15 | Phase E + G (partial) |
| Sprint 16 | Phase F + G |
| Sprint 17 | Phase H |
