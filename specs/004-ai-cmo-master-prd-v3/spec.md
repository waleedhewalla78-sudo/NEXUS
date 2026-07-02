# Feature Specification: Nexus Social AI CMO Master PRD v3.0

**Feature Branch**: `004-ai-cmo-master-prd-v3`

**Created**: 2026-06-23

**Status**: Sprint 12 foundation **complete** (2026-06-24) — hierarchy, event bus, SoR reconciler, orchestration stub, policy/quality engines, memory/finops/attribution/evaluation schemas. Sprint 13+ deferred (Inngest install, worker wiring, UI).

**Relationship to Feature 003**: [003-real-integrations-production](../003-real-integrations-production/spec.md) delivers launch-ready real publishing, analytics, schema automation, and UX table stakes. **004 builds the AI CMO operating system on top without regressing 003.**

## Executive Summary

PRD v3.0 transforms Nexus Social from a feature-rich demo into an **Enterprise Marketing Operating System** with 10 layers (management UI → orchestration → policy → memory → agent mesh → optimization → execution/reconciler → observability/finops → infrastructure → productization hierarchy).

Architecture maturity target: **9.7/10** (SAP IBP / Kinaxis class patterns).

## 10-Layer Architecture

| Layer | Components |
|-------|------------|
| L1 Management | AI CMO Dashboard, Policy Console, FinOps, Portfolio S&OP, Attribution, AI Ops, Approvals |
| L2 Orchestration | Inngest/Temporal workflows, event bus, retries, DLQ, cross-agent coordination |
| L3 Policy & Governance | Risk classifier, compliance rules, calibrated confidence, audit trail |
| L4 Memory | Decision ledger, learnings, outcomes, strategy history, knowledge hub |
| L5 Agent Mesh | Dify runtime (Brain, Creator, Radar, Quant, Optimizer, Finance, ChannelRisk, Compliance) |
| L6 Optimization | Budget allocator, scheduler, bid optimizer, A/B allocator |
| L7 Execution | Publishing workers, CRM sync, SoR/SoI reconciler, idempotency |
| L8 Observability | AI Ops dashboard, cost ledger, attribution, LLM-as-judge |
| L9 Infrastructure | Supabase RLS, Redis, event bus, Qdrant, OpenTelemetry, circuit breakers |
| L10 Productization | Tenant → Workspace → Brand → Campaign hierarchy |

## Module Catalog (A–W)

| Module | Name | Sprint 12 scope |
|--------|------|-----------------|
| A | AI Orchestration (Inngest) | Workflow skeleton |
| B | Memory Layer | Schema: learnings, outcomes, strategy_history |
| C | Policy Engine | Risk-based rules + calibrated confidence |
| D | Content Quality Engine | SEO/EEAT gates |
| E | FinOps | cost_ledger + materialized view |
| F–I | Attribution, Optimizer, Revenue, Compliance | Attribution schema (Sprint 12); agents deferred |
| J | Knowledge Hub | Deferred Sprint 13+ |
| K | Productization Hierarchy | tenants, brands, RLS |
| L | AI Evaluation | evaluations schema |
| M–W | BCP, AI Ops, Attribution models, SoR/SoI, Event Bus, Horizons, Confidence, Channel Risk, Explainability, Portfolio S&OP, Decision Ledger | Event bus + reconciler (Sprint 12); remainder Sprint 13–17 |

## Gap Resolution (20/20)

All 20 gaps from PRD v3.0 are addressed in the roadmap; Sprint 12 closes gaps **8, 13, 14, 16** (hierarchy, SoR/SoI, event-driven, calibrated confidence) plus foundational schemas for **2, 5, 9, 12, 20**.

## Success Metrics (Final Targets)

| Metric | Target |
|--------|--------|
| AI cost per lead | < $5 |
| Hallucination rate | < 2% |
| Policy violation rate (published) | 0% |
| Campaign ROI improvement | +15% QoQ |
| Attribution coverage | > 90% |
| Reconciler latency | < 100ms |
| Event bus throughput | 10,000 events/hour |

## Implementation Status (2026-06-23)

| Sprint 12 Task | Status |
|----------------|--------|
| T001 Productization hierarchy | Complete |
| T002 Event bus | Complete (Redis Streams) |
| T003 SoR/SoI reconciler | Complete |
| T004 Orchestration skeleton | Complete (stub; Inngest deferred) |
| T005 Memory layer schema | Complete |
| T006 FinOps schema | Complete |
| T007 Attribution schema | Complete |
| T008 AI evaluations schema | Complete |
| T009 Policy + calibrated confidence | Complete |
| T010 Content quality engine | Complete |

## Clarified Decisions

See [clarifications.md](./clarifications.md) for event bus, orchestration, campaign mapping, and hierarchy migration decisions.

## Related Specifications

- [003-real-integrations-production](../003-real-integrations-production/spec.md) — launch integrations baseline (do not regress)
- [002-nexus-social-platform](../002-nexus-social-platform/) — product vision
- [001-production-readiness-hardening](../001-production-readiness-hardening/) — workers, webhooks, billing
