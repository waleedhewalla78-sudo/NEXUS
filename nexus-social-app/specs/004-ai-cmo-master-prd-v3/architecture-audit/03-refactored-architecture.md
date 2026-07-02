# Phase 2 — Refactored 9-Layer Architecture

**Date:** 2026-06-23 · **Supersedes:** PRD 10-layer diagram (consolidates L6+L7 into Execution, merges Infrastructure into Observability boundaries)

Target stack: Next.js 16 · Supabase/PostgreSQL/RLS · Redis · Inngest · Dify (runtime) · OpenRouter · Qdrant · Activepieces · Meta/LinkedIn

---

## Layer Overview

```text
┌─────────────────────────────────────────────────────────────────┐
│ L1  Dashboard & Management Interface                          │
├─────────────────────────────────────────────────────────────────┤
│ L2  API Gateway & Edge                                          │
├─────────────────────────────────────────────────────────────────┤
│ L3  Orchestration (Inngest)                                     │
├─────────────────────────────────────────────────────────────────┤
│ L4  Policy & Governance                                         │
├─────────────────────────────────────────────────────────────────┤
│ L5  Memory & Intelligence (Postgres + Qdrant)                   │
├─────────────────────────────────────────────────────────────────┤
│ L6  Agent Mesh (Dify runtime + OpenRouter fallback)             │
├─────────────────────────────────────────────────────────────────┤
│ L7  Execution & Reconciler (SoR/SoI)                            │
├─────────────────────────────────────────────────────────────────┤
│ L8  Observability & FinOps                                      │
├─────────────────────────────────────────────────────────────────┤
│ L9  Learning Loop (closed-loop feedback)                        │
└─────────────────────────────────────────────────────────────────┘
```

**Constitution alignment:** Agents (L6) never write SoR directly. All mutations pass L7 reconciler. Dify is never L3.

---

## L1 — Dashboard & Management Interface

| Attribute | Specification |
|-----------|---------------|
| **Responsibilities** | AI CMO command center, approval inbox, FinOps dashboard, portfolio S&OP views, brand/tenant settings, explainability panels |
| **Boundaries** | Read-heavy; mutations via L2 API only. No direct Supabase writes from browser except via RLS-scoped client for non-AI entities |
| **Key surfaces** | `/ai-cmo/*`, `PersonaExplainabilityPanel`, future `TenantBrandPicker`, approval queue UI |
| **Interfaces** | REST `/api/v1/ai-cmo/*`, Server Components + TanStack Query |
| **Events consumed** | Job status webhooks (SSE/poll), approval state changes |
| **Failure modes** | Stale job status → show last known + retry button; empty FinOps → "awaiting first campaign" state |
| **Current gap** | Hierarchy UI missing; AI Ops dashboard schema-only |

---

## L2 — API Gateway & Edge

| Attribute | Specification |
|-----------|---------------|
| **Responsibilities** | Auth (Supabase JWT), workspace scoping, rate limiting, request validation (Zod), async job enqueue |
| **Boundaries** | No agent logic; no LLM calls. Validates and delegates to L3 |
| **Key routes** | `POST/GET /api/v1/ai-cmo/campaigns`, `POST /api/v1/ai-cmo/confidence`, future `/api/inngest` |
| **Interfaces** | `verifyWorkspaceMembership`, Zod schemas, `202 + jobId` for long runs |
| **Events emitted** | `campaign.requested`, `approval.submitted` → L3 via Inngest |
| **Failure modes** | 401/403 on RLS fail; 429 on rate limit; 402 on budget cap (L8 pre-check) |
| **Current gap** | Campaign POST runs sync workflow — must become enqueue-only |

---

## L3 — Orchestration (Inngest)

| Attribute | Specification |
|-----------|---------------|
| **Responsibilities** | Workflow state machine, step retries, scheduling, fan-out/fan-in, event-driven replanning, DLQ |
| **Boundaries** | No LLM prompts; no direct DB writes. Calls L4–L7 via typed deps |
| **Workflows** | `campaign-workflow`, `optimizer-loop`, `outcome-ingestion`, `mv-refresh`, `event-replan` |
| **Interfaces** | `inngest.createFunction`, `step.run()`, `MarketingEventBus` → `inngest.send()` |
| **Events consumed** | `marketing.campaign.underperforming`, `marketing.budget.threshold_hit`, `campaign.requested` |
| **Events emitted** | `campaign.completed`, `campaign.failed`, `learning.created` |
| **Failure modes** | Step retry 3x → DLQ table; idempotency via Inngest `id` + workspace key |
| **Current state** | `src/lib/orchestration/workflows/campaign-workflow.ts` pure function stub |

---

## L4 — Policy & Governance

| Attribute | Specification |
|-----------|---------------|
| **Responsibilities** | Risk classification (LOW/MED/HIGH/CRITICAL), approval routing, MENA compliance rules, audit trail |
| **Boundaries** | Evaluates structured content + metadata; **never** uses LLM confidence as approval bypass |
| **Key modules** | `policy-engine.ts`, future `compliance-agent.ts`, `ai_cmo_approval_requests` |
| **Interfaces** | `PolicyEngine.evaluate(ContentPiece) → PolicyResult` |
| **Events emitted** | `policy.blocked`, `policy.approval_required` |
| **Failure modes** | Ambiguous content → default HIGH tier + human review; rule engine error → block (fail closed) |
| **Current gap** | Regex heuristics in deps; no approval queue table |

---

## L5 — Memory & Intelligence

| Attribute | Specification |
|-----------|---------------|
| **Responsibilities** | Learnings store, strategy history, semantic retrieval (Qdrant), campaign outcome archive |
| **Boundaries** | SoI — agents read via repository; writes via L7 reconciler only |
| **Tables** | `ai_cmo_learnings`, `ai_cmo_strategy_history`, `ai_cmo_campaign_outcomes`, `ai_cmo_strategies` |
| **Interfaces** | `MemoryRepository.retrieve({ workspaceId, objective, k })`, `storeLearning()` |
| **Events consumed** | `campaign.completed`, analytics sync complete |
| **Failure modes** | Qdrant down → Postgres full-text fallback; empty memory → Brain uses cold-start prompts |
| **Current gap** | Tables live (000012); `retrieveMemory → []`; no repository |

---

## L6 — Agent Mesh

| Attribute | Specification |
|-----------|---------------|
| **Responsibilities** | Specialized AI agents: Brain, Creator, Radar, Quant, Optimizer, Sentinel, Finance, Compliance |
| **Boundaries** | Stateless per invocation; Dify for RAG/tools; OpenRouter fallback; outputs are proposals not commits |
| **Runtime** | `src/lib/dify/client.ts`, `src/lib/ai-cmo/*.ts`, future `src/jobs/ai-cmo/` |
| **Interfaces** | `planCampaignStrategy()`, `generateCampaignContent()`, `runOptimizer()`, etc. |
| **Events emitted** | Agent-complete signals with token usage metadata → L8 |
| **Failure modes** | Dify timeout → OpenRouter; both fail → circuit breaker open → queued retry |
| **Current state** | Brain + Creator only; Dify publish pending (S13-T012) |

---

## L7 — Execution & Reconciler

| Attribute | Specification |
|-----------|---------------|
| **Responsibilities** | SoR/SoI boundary, validate + RLS + audit + atomic write, campaign→post linking, publish handoff |
| **Boundaries** | **Only** layer that inserts/updates `ai_cmo_*`, `posts` from agent outputs |
| **Key module** | `src/lib/sync/reconciler.ts`, `src/lib/ai-cmo/campaign-service.ts` |
| **Tables** | All `SorTableNames` enums + future `ai_cmo_decision_ledger` |
| **Interfaces** | `syncToSoR()`, future `updateSoR()`, `validateWrite()` |
| **Events emitted** | `sor.campaign.created`, `sor.content.persisted` |
| **Failure modes** | Validation fail → return to L3 for replan; RLS fail → security alert |
| **Current gap** | Insert-only; `post_id` not wired; no decision ledger table |

---

## L8 — Observability & FinOps

| Attribute | Specification |
|-----------|---------------|
| **Responsibilities** | Token/cost tracking, budget enforcement, OTel traces, Langfuse LLM spans, Sentry errors, AI Ops metrics |
| **Boundaries** | Cross-cutting; hooks at L3 step boundaries and L6 agent wrappers |
| **Tables** | `ai_cmo_cost_ledger`, `ai_cmo_cost_summary`, `budget_policies`, `token_usage` (new) |
| **Interfaces** | `recordAgentCost()`, `checkBudget()`, OTel `tracer.startSpan()` |
| **Events consumed** | All agent completions |
| **Failure modes** | Budget exceeded → block L3 start; observability backend down → local buffer + async flush |
| **Current gap** | Schema only; no runtime writes; no Langfuse |

---

## L9 — Learning Loop

| Attribute | Specification |
|-----------|---------------|
| **Responsibilities** | Outcome measurement, variance analysis, lesson extraction, Optimizer feedback, strategy revision |
| **Boundaries** | Closes loop: Decision (L6/L7) → KPI (analytics) → Lesson (L5) → Next plan (L6 Brain) |
| **Key flow** | `post_analytics` → `ai_cmo_campaign_outcomes` → Optimizer → `ai_cmo_learnings` → Brain retrieval |
| **Interfaces** | Optimizer agent, decision ledger, evaluation scores |
| **Events consumed** | `analytics.synced`, `campaign.completed` |
| **Events emitted** | `learning.validated`, `strategy.revised` |
| **Failure modes** | Insufficient data → Optimizer skips with logged reason; human validation gate for HIGH tier learnings |
| **Current gap** | Entire loop unimplemented |

---

## Cross-Layer Event Catalog (Target)

| Event | Producer | Consumer(s) |
|-------|----------|-------------|
| `campaign.requested` | L2 API | L3 workflow |
| `marketing.campaign.underperforming` | L9 / analytics | L3 replan |
| `marketing.budget.threshold_hit` | L8 FinOps | L3 pause/reallocate |
| `policy.approval_required` | L4 | L1 approval UI |
| `sor.content.persisted` | L7 | L8 cost finalize, L9 eval job |
| `learning.created` | L9 Optimizer | L5 memory index |

---

## Migration from Current Codebase

| Current file | Target layer | Action |
|--------------|--------------|--------|
| `campaign-workflow.ts` | L3 | Port steps to Inngest functions |
| `campaign-workflow-deps.ts` | L3–L7 wiring | Keep as deps factory; fix memory + policy |
| `marketing-event-bus.ts` | L3 transport | Bridge to Inngest.send |
| `reconciler.ts` | L7 | Add update path + decision ledger |
| `policy-engine.ts` | L4 | Expand rules; structured input |
| `strategic-brain.ts`, `creator-agent.ts` | L6 | Add cost hooks |
| `worker.ts` | L3 + L7 + L9 | Add event consumer + MV refresh |

See [04-orchestration-strategy.md](./04-orchestration-strategy.md) for L3 tooling decision.
