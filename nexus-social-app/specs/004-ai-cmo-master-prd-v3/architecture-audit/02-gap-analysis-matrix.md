# Phase 1 — Gap Analysis Matrix

**Date:** 2026-06-23 · **Prioritization:** Critical → Low · **Sprint mapping:** Aligns to revised Phases A–H (doc 15)

Legend: **Exists** = live in Supabase + code · **Schema** = migration only · **Missing** = not implemented

---

## Critical Gaps (Release Blockers for 5,000 Workspaces)

| ID | Gap | PRD Module | Current State | Remediation | Sprint/Phase |
|----|-----|------------|---------------|-------------|--------------|
| C1 | Durable async orchestration | A | Stub `campaign-workflow.ts` | Install Inngest; async campaign API | Phase B / Sprint 14 |
| C2 | Worker ↔ marketing event bus | Q | Bus exists; worker ignores it | Register consumers in `worker.ts` | Phase B / Sprint 14 |
| C3 | FinOps runtime + budget caps | E | Schema `ai_cmo_cost_ledger`; no writes | Ledger middleware + `budget_policies` | Phase D / Sprint 14–15 |
| C4 | Agency hierarchy | K | `tenants` only; no `agencies` | Migration 000014 + backfill | Phase H / Sprint 16–17 |
| C5 | Campaign workflow async (no HTTP block) | A | Sync POST `/api/v1/ai-cmo/campaigns` | 202 + job polling | Phase B / Sprint 14 |
| C6 | Memory retrieval wired | B | `retrieveMemory → []` | MemoryRepository + Qdrant | Phase C / Sprint 14 |
| C7 | Service-role write blast radius | Security | `supabaseAdmin` + membership only | Per-workspace rate limits + alerts | Phase F / Sprint 15 |
| C8 | Human approval queue | C | Callback stub only | `ai_cmo_approval_requests` table + UI | Phase E / Sprint 15 |

---

## High Gaps

| ID | Gap | PRD Module | Current State | Remediation | Sprint/Phase |
|----|-----|------------|---------------|-------------|--------------|
| H1 | Optimizer agent | G | Missing | `optimizer-agent.ts` + outcome trigger | Phase C / Sprint 14 |
| H2 | Outcome ingestion | B, W | `ai_cmo_campaign_outcomes` empty | Job: `post_analytics` → outcomes | Phase C / Sprint 14 |
| H3 | LLM-as-Judge evaluations | L | Schema only | Post-Creator eval job | Phase E / Sprint 14 |
| H4 | Campaign → post reconciler link | P | `post_id` never set | Create post via reconciler | Phase B / Sprint 14 |
| H5 | Radar agent | T | `listening_queries` / `mentions` (003) | Signal → event bus | Phase G / Sprint 15 |
| H6 | Structured policy classification | C | Regex on JSON string | ContentPiece pipeline | Phase E / Sprint 15 |
| H7 | Circuit breakers | M | Missing | `circuit-breaker.ts` on Dify/OpenRouter | Phase F / Sprint 15 |
| H8 | DLQ / failed job persistence | A | Console.error only | Inngest onFailure + table | Phase B / Sprint 14 |
| H9 | MV refresh cron | E, F | Views stale | Worker REFRESH job | Phase D / Sprint 14 |
| H10 | AI Ops dashboard | N | Admin health only | Agent metrics page | Phase F / Sprint 16 |
| H11 | Compliance agent (MENA) | I | 6 policy rules | Expanded ruleset + agent | Phase E / Sprint 16 |
| H12 | Multi-provider LLM fallback | A | OpenRouter only | ModelProvider abstraction | Phase F / Sprint 15 |
| H13 | PII scrubbing in memory | Compliance | None | Pre-write scrubber | Phase E / Sprint 15 |
| H14 | Confidence persistence | S | API-only | Write to evaluations | Phase E / Sprint 14 |

---

## Medium Gaps

| ID | Gap | PRD Module | Current State | Remediation | Sprint/Phase |
|----|-----|------------|---------------|-------------|--------------|
| M1 | Decision ledger table | W | data-model only | Migration 000013 | Phase C / Sprint 14 |
| M2 | Reconciler update/upsert | P | Insert-only | `updateSoR` | Phase B / Sprint 15 |
| M3 | Knowledge Hub (11 sources) | J | Partial RAG | Source registry | Phase C / Sprint 15 |
| M4 | Portfolio S&OP | V | Missing | Executive scenarios API | Phase G / Sprint 16 |
| M5 | Finance / Revenue agent | H | Missing | Stripe pipeline tie-in | Phase G / Sprint 16 |
| M6 | Channel Risk agent | T | Event types only | Heatmap API | Phase G / Sprint 15 |
| M7 | Quant agent | — | Missing | Analytics interpretation agent | Phase G / Sprint 16 |
| M8 | Sentinel agent | — | Missing | Anomaly detection on metrics | Phase G / Sprint 16 |
| M9 | Tenant admin RLS | K | Workspace-only | Tenant-scoped policies | Phase H / Sprint 17 |
| M10 | Data residency routing | Compliance | Missing | `tenants.data_region` | Phase H / Sprint 17 |
| M11 | Hierarchy UI | K | DB only | Brand picker + tenant settings | Phase H / Sprint 17 |
| M12 | Unified credit/cost view | E | Two ledgers | Reporting MV | Phase D / Sprint 15 |
| M13 | Redis stream sharding | Q | Single stream | Partition by tenant hash | Phase F / Sprint 16 |
| M14 | Dify apps unpublished | A | OpenRouter fallback | Operator: S13-T012 | Immediate |
| M15 | E2E AI CMO smoke | — | Missing | Playwright campaign flow | Phase H / Sprint 17 |

---

## Low Gaps

| ID | Gap | PRD Module | Current State | Remediation | Sprint/Phase |
|----|-----|------------|---------------|-------------|--------------|
| L1 | Idempotency TTL extension | Q | 24h Redis | 7d + Postgres backup | Phase F |
| L2 | Prompts in repo vs Dify-only | Vendor | Dify-hosted | Export prompts to git | Phase F |
| L3 | Qdrant abstraction | J | Direct client | VectorStore interface | Phase C |
| L4 | Audit log cold archive | Compliance | Undefined retention | S3/archive policy | Phase H |
| L5 | Kafka transport option | Q | Redis Streams | Interface swap if needed | Future |
| L6 | Temporal evaluation | A | Inngest preferred | Revisit if Inngest limits hit | Future |

---

## Module A–W Completion Matrix

| Module | Name | Schema | Runtime | Tests | Target Phase |
|--------|------|--------|---------|-------|--------------|
| A | Orchestration | — | 20% | ✓ stub | B |
| B | Memory | ✓ | 5% | partial | C |
| C | Policy | — | 60% | ✓ | E |
| D | Quality | — | 70% | ✓ | E |
| E | FinOps | ✓ | 0% | — | D |
| F | Attribution | ✓ | 0% | — | D |
| G | Optimizer | — | 0% | — | C |
| H | Revenue | — | 0% | — | G |
| I | Compliance | — | 25% | ✓ policy | E |
| J | Knowledge Hub | partial | 30% | — | C |
| K | Hierarchy | ✓ | 10% | — | H |
| L | Evaluations | ✓ | 0% | — | E |
| M | BCP | — | 0% | — | F |
| N | AI Ops | — | 5% | — | F |
| O | Attribution models | ✓ MV | 0% | — | D |
| P | Reconciler | — | 65% | ✓ | B |
| Q | Event Bus | — | 50% | ✓ | B |
| R | Horizons | — | 40% | — | C |
| S | Calibrated confidence | — | 75% | ✓ | E |
| T | Channel Risk | — | 10% | — | G |
| U | Explainability | — | 80% | ✓ | E |
| V | Portfolio S&OP | — | 0% | — | G |
| W | Decision Ledger | doc | 0% | — | C |

---

## Dependency-Ordered Remediation Sequence

```text
Phase A (Gate) ──► Leadership approvals: Inngest, Langfuse, agency schema
       │
Phase B (Orchestration) ──► C1, C2, C5, H4, H8, M2
       │
Phase C (Memory loop) ──► C6, H1, H2, M1, M3
       │
Phase D (FinOps) ──► C3, H9, M12
       │
Phase E (Governance) ──► C8, H3, H6, H11, H13, H14
       │
Phase F (Observability) ──► C7, H7, H12, N, M13
       │
Phase G (Agent mesh) ──► H5, M4–M8
       │
Phase H (Productization) ──► C4, M9–M11, M15, DR
```

---

## Sprint Mapping (Legacy 14–17 → Audit Phases)

| Legacy Sprint | Audit Phase | Primary gaps closed |
|---------------|-------------|---------------------|
| Sprint 14 | B + C + D + E (partial) | C1–C6, H1–H4, H8–H9, H14, M1 |
| Sprint 15 | E + F + G (partial) | H5–H7, H12–H13, M2, M6 |
| Sprint 16 | F + G + H (partial) | H10–H11, M4–M5, M8–M9, C4 prep |
| Sprint 17 | H | M10–M11, M15, launch hardening |

See [15-roadmap-phases-A-H.md](./15-roadmap-phases-A-H.md) for full phase definitions.
