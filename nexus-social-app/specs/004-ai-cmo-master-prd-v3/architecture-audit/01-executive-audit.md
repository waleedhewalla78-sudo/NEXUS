# Phase 1 — Executive Architecture Audit

**Auditor:** Principal AI Architect · **Date:** 2026-06-23  
**Scope:** Nexus Social AI CMO (Feature 004) post Sprint 12–13  
**Method:** Spec/code gap analysis against PRD v3.0, constitution, LAUNCH_CHECKLIST, and 003 baseline

---

## Audit Summary

PRD v3.0 claims architecture maturity **9.7/10** and "20/20 critical gaps closed (design)." Code reality: **~35% of Module A–W runtime implemented**; schemas largely live (11/11 via `schema:verify:004`) but **orchestration, memory, FinOps, attribution, and 5 of 8 agents are stub or absent**. The foundation is sound for a single-workspace demo; **enterprise scale (5,000 workspaces) is not supported** without the remediations in documents 02–16.

---

## Issue Register (28 Distinct Issues)

### Missing Layers & Architecture

| # | Issue | Impact | Risk | Root Cause | Recommendation |
|---|-------|--------|------|------------|----------------|
| 1 | **No durable workflow orchestration** — `runCampaignWorkflow` is a synchronous pure function; `createStubOrchestrationClient()` queues events in memory only | Campaign runs block HTTP requests; no retry, no pause/resume, no fan-out | **Critical** — single process failure loses in-flight campaigns | CL-002 deferred Inngest; no Temporal/Celery equivalent wired | Approve **Inngest** (doc 04); add `src/app/api/inngest/route.ts` Sprint 14 |
| 2 | **Marketing event bus not connected to `worker.ts`** | Events published to Redis Streams have **no consumer** in production worker | **High** — event-driven replanning is dead code | Sprint 13 consumers are stubs; worker runs publish/analytics/RAG only | Register `registerDefaultMarketingEventConsumers` in worker; wire `triggerReplan` to Inngest |
| 3 | **Memory layer returns empty** — `retrieveMemory: async () => []` in `campaign-workflow-deps.ts` | Brain/Creator cannot learn from past campaigns | **High** — closed loop impossible | Sprint 14 memory repo deferred; tables exist but no repository | Implement `MemoryRepository` on `ai_cmo_learnings` + Qdrant hybrid retrieval |
| 4 | **5 of 8 PRD agents missing** — only Strategic Brain + Creator exist in `src/lib/ai-cmo/` | Radar, Quant, Optimizer, Finance, ChannelRisk, Compliance not runnable | **High** — PRD module catalog overstated vs code | Sprint 14–16 planned but not started | Phase roadmap B–H (doc 15); stub interfaces now, implement per sprint |
| 5 | **`ai_cmo_decision_ledger` in data-model but not in migration 000012** | Module W (Decision Ledger) has no SoR table | **Medium** — audit trail for decisions incomplete | Schema doc ahead of migration; reconciler has no ledger table enum | Add migration `000013_decision_ledger` + reconciler `SorTableNames` entry |
| 6 | **No Learning loop layer** — outcomes never written to `ai_cmo_campaign_outcomes` | Optimizer has no input signal | **High** | No job syncs `post_analytics` → outcomes | Sprint 14 outcome ingestion job + Optimizer trigger |
| 7 | **Knowledge Hub (Module J) absent** — Dify datasets partial, no 11 source types | RAG quality limited to post_analytics ingest | **Medium** | Deferred Sprint 14 | Define source registry; extend `ingest-post-analytics-rag.ts` pattern |
| 8 | **Portfolio S&OP layer (Module V) not designed in code** | Cross-brand budget tradeoffs impossible for agencies | **Medium** | Sprint 16 deferred | Add executive API + `ai_cmo_portfolio_scenarios` table Phase G |

### Scalability

| # | Issue | Impact | Risk | Root Cause | Recommendation |
|---|-------|--------|------|------------|----------------|
| 9 | **Synchronous campaign API** — `POST /api/v1/ai-cmo/campaigns` runs full workflow inline | p95 agent latency target (<30s) will breach under load; Vercel/serverless timeout risk | **Critical** at 5k workspaces | No job queue for campaign workflow | Return `202 Accepted` + job ID; orchestrate via Inngest |
| 10 | **Single Redis instance for streams + BRPOP + cache + heartbeat** | Hot-key contention; no stream partitioning by tenant | **High** | CL-001 chose Redis Streams on shared `REDIS_URL` | Shard streams by `workspace_id` hash; consider dedicated Redis for marketing events |
| 11 | **Materialized views without refresh schedule** — `ai_cmo_cost_summary`, `ai_cmo_attribution_summary` | Stale FinOps/attribution dashboards | **Medium** | Sprint 14 MV refresh cron not implemented | Worker cron `REFRESH MATERIALIZED VIEW CONCURRENTLY` hourly |
| 12 | **Reconciler insert-only** — `syncToSoR` has no update/upsert path | Campaign state transitions require direct Supabase or duplicate rows | **Medium** | Sprint 12 scoped to insert + audit | Add `updateSoR` with optimistic locking for status transitions |
| 13 | **No connection pooling strategy documented for agent burst** | 100k assets/month ≈ 3.3k/day; peak could exhaust Supabase pool | **High** | Next.js serverless + worker share admin client | PgBouncer transaction mode; cap concurrent agent runs per workspace |
| 14 | **Qdrant ingest is periodic (6h)** — `RAG_INGEST_INTERVAL_MS` default 21.6M ms | Brain retrieval lag up to 6 hours | **Medium** | Batch-oriented worker loop | Event-driven ingest on `post_analytics` insert trigger |

### Security

| # | Issue | Impact | Risk | Root Cause | Recommendation |
|---|-------|--------|------|------------|----------------|
| 15 | **Policy review uses regex on JSON.stringify(plan)** — not structured classification | False negatives on embedded risks; false positives on benign JSON keys | **High** — compliance exposure in MENA | Sprint 13 MVP heuristic in `campaign-workflow-deps.ts` | Structured `ContentPiece` extraction from Creator output; LLM classifier for ambiguous cases |
| 16 | **No tenant-level RLS on `tenants` table for agency admins** | Agency roll-up queries may require service role bypass | **Medium** | RLS via workspace_members only; tenant policies additive incomplete | Sprint 17: tenant admin role + RLS policy on `tenants` SELECT |
| 17 | **`supabaseAdmin` in reconciler bypasses user RLS** — membership check only | Compromised service key = full write access | **Critical** if key leaked | By design for server writes; no secondary guard | Workspace-scoped service tokens; rate limit reconciler writes per workspace |
| 18 | **No PII scrubbing in `ai_cmo_learnings.context` JSONB** | GDPR/UAE PDPL violation if visitor emails stored in learnings | **High** | No retention/scrub policy on memory tables | PDPL scrubber before memory persist; TTL + anonymization job |
| 19 | **Idempotency key TTL 24h only** — Redis `SET EX 86400` | Replay attacks after TTL for financial attribution events | **Low–Medium** | Default in `marketing-event-bus.ts` | Extend to 7d for money-adjacent events; persist idempotency in Postgres |
| 20 | **Dify workspace keys in `ai_agent_configs.dify_app_api_key`** | Per-workspace API key exposure via admin UI | **Medium** | CL-005 workspace override pattern | Encrypt at rest; rotate; audit key access |

### AI Governance

| # | Issue | Impact | Risk | Root Cause | Recommendation |
|---|-------|--------|------|------------|----------------|
| 21 | **Quality gate uses confidence-like score for auto-publish** — `quality.score < 0.85` routes to approval but policy already ran | Dual gate confusion; not purely risk-based | **Medium** | `campaign-workflow.ts` lines 68–71 conflate quality score with governance | Separate **risk tier** from **quality score** (doc 06); never auto-publish CRITICAL tier |
| 22 | **Calibrated confidence not persisted** — only in API response / content JSONB | Cannot audit historical confidence claims | **Medium** | No column on `ai_cmo_content_pieces` or evaluations | Write confidence + band to `ai_cmo_evaluations` on each generation |
| 23 | **No human approval queue table** | `routeToApproval` is callback-only; no SLA tracking | **High** for regulated industries | Sprint 13 stub | Add `ai_cmo_approval_requests` with status, assignee, expiry |
| 24 | **LLM-as-Judge not implemented** — `ai_cmo_evaluations` empty | No automated quality regression detection | **High** | Schema only | Sprint 14 evaluation job post-Creator (doc 07) |
| 25 | **OpenRouter fallback without model allowlist per workspace** | Cost explosion; unapproved models | **Medium** | Fallback in `strategic-brain.ts` / `creator-agent.ts` | `ai_cmo_model_policies` table; enforce in agent wrapper |

### Data Model

| # | Issue | Impact | Risk | Root Cause | Recommendation |
|---|-------|--------|------|------------|----------------|
| 26 | **Agency entity missing** — PRD says Tenant→Workspace→Brand; target is Tenant→**Agency**→Client Brand | 500 agencies cannot bill/isolate correctly | **Critical** for productization | 000011 added `tenants` not `agencies` | Migration 000014 `agencies` + `brands.agency_id` (doc 12) |
| 27 | **`ai_cmo_strategies` has no RLS test coverage in CI** | Strategy history leak across workspaces | **Medium** | Policies exist in 000012 but no dedicated test | Add RLS integration test in Sprint 14 |
| 28 | **No `budget_policies` / `token_usage` tables** — FinOps schema is ledger-only | Cannot enforce caps before agent run | **Critical** for FinOps | PRD FinOps module incomplete in 000012 | Add tables per doc 09; pre-flight budget check in orchestration |

### Orchestration (Additional)

| # | Issue | Impact | Risk | Root Cause | Recommendation |
|---|-------|--------|------|------------|----------------|
| 29 | **AI orchestration uses Redis BRPOP `queue:ai-orchestration`** — separate from marketing event bus | Two queue systems without unified DLQ | **Medium** | Legacy 003 pattern + new event bus | Consolidate under Inngest; deprecate BRPOP path |
| 30 | **No DLQ for failed agent steps** | Failed jobs logged to console only in `worker.ts` | **High** | No dead-letter stream or table | Inngest failure handler → `ai_cmo_failed_jobs` |

### Ops / Compliance

| # | Issue | Impact | Risk | Root Cause | Recommendation |
|---|-------|--------|------|------------|----------------|
| 31 | **No circuit breakers** — constitution mentions Sprint 16 | Cascading Dify/OpenRouter failures take down campaigns | **High** at scale | `src/lib/resilience/circuit-breaker.ts` not created | Implement before Sprint 15 external intel |
| 32 | **MENA compliance agent deferred** — only 6 rules in `POLICY_RULES` | UAE PDPL / Egypt DPL gaps for data residency messaging | **High** for MENA GTM | Sprint 16 deferred | Expand ruleset + locale-specific templates (doc 06) |
| 33 | **No data residency flag per tenant** | Cannot route inference to EU/MENA endpoints | **Medium** | Not in `tenants` schema | Add `tenants.data_region` + routing in Dify/OpenRouter client |
| 34 | **Audit log retention undefined** — `auditLog()` on reconciler writes | Compliance audit trail may be purged | **Medium** | No retention policy in spec | 7-year archive to cold storage for enterprise tier |

### Vendor Lock-in

| # | Issue | Impact | Risk | Root Cause | Recommendation |
|---|-------|--------|------|------------|----------------|
| 35 | **Dify as primary agent runtime** — prompts/workflows in Dify apps | Migration cost if switching LLM orchestration | **Medium** | CL-005 Dify-first pattern | Keep prompts in repo (`prompts/ai-cmo/`); Dify as optional runtime |
| 36 | **OpenRouter single vendor for fallback** | Outage = Brain/Creator hard down | **High** | No multi-provider abstraction | `ModelProvider` interface: OpenRouter, Azure OpenAI, local |
| 37 | **Qdrant coupled in RAG ingest job** | Vector store migration painful | **Low–Medium** | Direct Qdrant client in job | Abstract `VectorStore` interface (already partial in 003) |

### FinOps

| # | Issue | Impact | Risk | Root Cause | Recommendation |
|---|-------|--------|------|------------|----------------|
| 38 | **`ai_cmo_cost_ledger` never written at runtime** | FinOps module is schema-only | **Critical** | Sprint 14 FinOps runtime deferred | Middleware on every agent call: token count → ledger row |
| 39 | **`ai_credit_ledger` (003) vs `ai_cmo_cost_ledger` (004) not unified** | Two billing stories; customer confusion | **Medium** | Feature split 003/004 | Unified cost view MV joining both ledgers |
| 40 | **No budget enforcement before workflow start** | Runaway token spend across 5k workspaces | **Critical** | No `budget_policies` | Pre-flight check in orchestration step 0 (doc 09) |

### Productization

| # | Issue | Impact | Risk | Root Cause | Recommendation |
|---|-------|--------|------|------------|----------------|
| 41 | **No hierarchy UI** — tenants/brands exist in DB only | Operators cannot assign brands to campaigns in UI | **High** | Sprint 17 deferred | Minimum viable brand picker Sprint 14 |
| 42 | **White-label not wired to AI CMO dashboard** | AI outputs may say "Nexus" not client brand | **Medium** | Explainability renderer uses generic labels | Pass `brands.name` + `brand_voice_config` into all agents |
| 43 | **Campaign → post link unused** — `ai_cmo_campaigns.post_id` nullable, never set in `campaign-service.ts` | SoR/SoI boundary incomplete for publish path | **High** | Reconciler write path stops at content pieces | Sprint 14 wire post creation + `post_id` FK |

---

## PRD Maturity Score Adjustment

| Dimension | PRD Claim | Audit Assessment |
|-----------|-----------|------------------|
| Design completeness | 9.7/10 | **8.5/10** — schemas strong; agency layer and decision ledger gaps |
| Runtime completeness | Implied Sprint 13 done | **3.5/10** — 2 agents, stub orchestration, no memory/FinOps runtime |
| Scale readiness (5k WS) | Implied production OS | **2/10** — see doc 16 |
| Governance | Risk-based | **5/10** — engine exists; heuristics immature; no approval queue |
| Compliance (MENA) | Addressed | **4/10** — baseline rules only |

---

## Top 5 Blockers Before Build Continues at Scale

1. **Approve and install Inngest** — unblock async campaigns, retries, event consumers  
2. **Agency hierarchy migration** — unblock 500-agency billing/isolation  
3. **FinOps pre-flight + ledger writes** — unblock cost control at 100k assets/month  
4. **Memory repository + outcome ingestion** — unblock closed loop / Optimizer  
5. **Langfuse + OTel baseline** — unblock AI Ops at 99.9% uptime debugging  

See [02-gap-analysis-matrix.md](./02-gap-analysis-matrix.md) for sprint mapping.
