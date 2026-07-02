# PRD v3.1 — Consolidated (Post-Audit)

**Version:** 3.1 · **Date:** 2026-06-23 · **Supersedes:** spec.md v3.0 where noted  
**Audit source:** `architecture-audit/` Phase 1–12

---

## Executive Summary

Nexus Social **AI CMO** is an autonomous marketing operating system built on Feature 003 (real publishing, analytics, OAuth). Sprint 12–13 delivered the **foundation**: productization schema, reconciler, policy/quality engines, event bus interface, Strategic Brain + Creator agents, and calibrated confidence with explainability.

This consolidated PRD adjusts maturity claims and prioritizes **production path to 5,000 workspaces, 500 agencies, 100k AI assets/month, 99.9% uptime**.

**Audit-adjusted maturity:** Design **8.5/10** · Runtime **3.5/10** · Scale readiness **2/10** (pre-Phase B–H)

---

## Strategic Principles (Unchanged)

1. **SoR/SoI:** Reconciler-only writes (`src/lib/sync/reconciler.ts`)  
2. **Event-driven:** Redis Streams → Inngest orchestration  
3. **Risk-based governance:** Never confidence-only approval  
4. **Closed-loop learning:** Outcome → Optimizer → memory → Brain  
5. **Dify = runtime only:** Orchestration in Inngest  

---

## 9-Layer Architecture (Replaces 10-layer)

See [03-refactored-architecture.md](./03-refactored-architecture.md).

| Layer | Name |
|-------|------|
| L1 | Dashboard & Management Interface |
| L2 | API Gateway & Edge |
| L3 | Orchestration (Inngest) |
| L4 | Policy & Governance |
| L5 | Memory & Intelligence |
| L6 | Agent Mesh |
| L7 | Execution & Reconciler |
| L8 | Observability & FinOps |
| L9 | Learning Loop |

---

## Module Catalog (Updated A–W)

| Module | Name | v3.0 status | v3.1 target |
|--------|------|-------------|-------------|
| A | Orchestration | Stub | Inngest production |
| B | Memory | Schema | Repository + Qdrant |
| C | Policy | 6 rules | Expanded + approval queue |
| D | Quality | Engine | 8-dimension + Judge |
| E | FinOps | Schema | Ledger runtime + budgets |
| F | Attribution | Schema | Ingestion + MV refresh |
| G | Optimizer | Planned | Sprint 14 Phase C |
| H | Revenue | Planned | Phase G |
| I | Compliance MENA | Partial | Compliance agent Phase E |
| J | Knowledge Hub | Partial | 11 sources Phase C |
| K | Hierarchy | 000011 | + agencies 000014 |
| L | Evaluations | Schema | Runtime Phase E |
| M | BCP/DR | Planned | Phase F + H |
| N | AI Ops | Planned | Langfuse + dashboard |
| O | Attribution ROI | MV | Dashboard Phase D |
| P | Reconciler | 65% | Update path + post link |
| Q | Event Bus | 50% | Worker + Inngest bridge |
| R | Horizons | Brain only | Full Phase C |
| S | Calibrated confidence | API | Persist to evaluations |
| T | Channel Risk | Events | Agent Phase G |
| U | Explainability | UI panel | + dimension breakdown |
| V | Portfolio S&OP | Planned | Phase G |
| W | Decision Ledger | Doc only | Migration 000013 |

---

## Agent Roster

| Agent | Status | Runtime |
|-------|--------|---------|
| Strategic Brain | ✓ Implemented | Dify + OpenRouter |
| Creator | ✓ Implemented | Dify + OpenRouter |
| Optimizer | Spec complete | Phase C |
| Radar | 003 listening partial | Phase G |
| Quant | Not started | Phase G |
| Sentinel | Not started | Phase G |
| Finance | Not started | Phase G |
| Compliance | Policy rules only | Phase E |

---

## Data Model Summary

**Live (000011 + 000012):** tenants, brands, workspaces.tenant_id, ai_cmo_campaigns, ai_cmo_content_pieces, ai_cmo_strategies, ai_cmo_learnings, ai_cmo_campaign_outcomes, ai_cmo_strategy_history, ai_cmo_cost_ledger, ai_cmo_attribution_events, ai_cmo_evaluations, MVs.

**Planned (000013–000014):** decision_ledger, experiments, agent_decisions, budget_policies, token_usage, agencies, approval_requests, failed_jobs.

---

## Success Metrics (Revised)

| Metric | v3.0 target | v3.1 target | Measurement |
|--------|-------------|-------------|-------------|
| Content output velocity | +500% | +500% @ 100 assets/ws/mo | content_pieces count |
| Time-to-campaign | <15 min | <15 min async (p95) | Inngest workflow duration |
| Agent latency p95 | <30s | <30s | OTel |
| Reconciler latency p99 | <100ms | <100ms | OTel |
| Policy violation auto-publish | 0% | 0% on CRITICAL | audit |
| Platform uptime | — | 99.9% | SLO dashboard |
| Cost per asset | — | <$0.08 avg | FinOps ledger |
| Learning validation rate | — | >70% | human validated / total |
| Closed-loop campaigns | — | 80% active measured | outcomes populated |

---

## Leadership Decisions (Blocking)

| ID | Decision | Recommendation |
|----|----------|----------------|
| LD-1 | Inngest vs Temporal | Inngest |
| LD-2 | Langfuse adoption | Yes (self-host option) |
| LD-3 | Agency table migration | New `agencies` (000014) |
| LD-4 | Dify role | Runtime-only (confirmed) |

---

## Out of Scope (v3.1)

- Mobile AI CMO app  
- Net-new social networks beyond 003 OAuth  
- Replacing Activepieces for non-marketing automation  
- On-prem LLM inference (future enterprise)  

---

## References

- [01-executive-audit.md](./01-executive-audit.md)  
- [15-roadmap-phases-A-H.md](./15-roadmap-phases-A-H.md)  
- [16-production-readiness-assessment.md](./16-production-readiness-assessment.md)  
- Constitution: `.specify/memory/constitution.md`  
- Feature 003: `specs/003-real-integrations-production/`
