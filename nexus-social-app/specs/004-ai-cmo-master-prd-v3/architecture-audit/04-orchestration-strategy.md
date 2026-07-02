# Phase 3 — Orchestration Strategy

**Date:** 2026-06-23 · **Decision owner:** Engineering leadership + CIO  
**Constitution ref:** Principle V — Dify is agent runtime only; orchestration in `src/lib/orchestration/`

---

## Requirements

| Requirement | Weight | Notes |
|-------------|--------|-------|
| Durable workflows with retries | Must | Campaign = 5–8 steps, 30s–5min |
| Event-driven triggers | Must | Redis Streams already chosen (CL-001) |
| Next.js/Vercel compatibility | Must | Serve handler pattern |
| DLQ + observability | Must | Failed jobs auditable |
| Idempotency | Must | Workspace + campaign + step key |
| Scheduling (cron) | Should | MV refresh, Optimizer batch |
| Human-in-the-loop pause | Should | Approval steps |
| Multi-tenant isolation | Must | 5,000 workspaces |
| Ops complexity | Should | Small team maintainability |
| Vendor lock-in | Should | Minimize |

---

## Option Comparison

### LangGraph

| Pros | Cons |
|------|------|
| Native agent graph modeling | Python-first; Nexus stack is TypeScript |
| Strong for cyclic agent flows | No built-in DLQ/scheduling/hosting |
| Good for research prototypes | Would require separate Python service |

**Verdict:** ❌ Reject for primary orchestrator — stack split, no durable job hosting.

---

### CrewAI

| Pros | Cons |
|------|------|
| Multi-agent role abstraction | Python; opinionated agent framework |
| Quick demos | Poor fit for SoR reconciler pattern |
| | Duplicates L6 agent mesh design |

**Verdict:** ❌ Reject — overlaps with Dify runtime + custom agents; wrong language.

---

### Temporal

| Pros | Cons |
|------|------|
| Gold-standard durability | Self-host complexity or Temporal Cloud cost |
| Long-running workflows | Heavier than needed for marketing steps |
| Strong versioning | New infra dependency (Temporal server) |
| | CL-002 already deferred pending approval |

**Verdict:** ⚠️ Viable for enterprise tier; **overkill for Phase 2** unless team has Temporal expertise.

---

### Inngest

| Pros | Cons |
|------|------|
| TypeScript-native; Next.js route handler | SaaS dependency (Cloud) or self-host |
| `step.run()` retries + idempotency built-in | New npm dep (needs approval) |
| Event → function mapping fits marketing bus | Less control than Temporal for 24h+ workflows |
| Already documented in PRD + README stub | |
| Fan-out, cron, concurrency limits | |
| Failure handlers → DLQ pattern | |

**Verdict:** ✅ **Selected** for Nexus AI CMO orchestration.

---

### Custom (Redis BRPOP + pure functions)

| Pros | Cons |
|------|------|
| Already partial (`queue:ai-orchestration`, event bus) | No step-level retry state |
| No new vendor | Manual DLQ, scheduling, idempotency |
| Zero dep approval | Two queue systems today (BRPOP + Streams) |
| | 99.9% uptime requires significant custom ops |

**Verdict:** ❌ Reject at 5k workspace target — current state is Sprint 12 stub only.

---

### Dify as Orchestrator

| Pros | Cons |
|------|------|
| Visual workflow editor | Violates constitution Principle V |
| Built-in LLM chaining | No fine-grained SoR reconciler integration |
| | Multi-tenant workflow isolation weak |
| | Vendor lock-in for **control plane** |

**Verdict:** ❌ **Explicitly rejected** — Dify remains **agent runtime only** (`sendDifyChatMessage`). Workflow state in Inngest.

---

## Selected Architecture: Inngest + Redis Event Bridge

```text
MarketingEventBus (Redis Streams)
        │ publish
        ▼
Inngest Event API  ◄── API Gateway (campaign.requested)
        │
        ├── campaign-workflow (step.run × N)
        ├── optimizer-loop (cron + event)
        ├── outcome-ingestion (cron)
        └── event-replan (consumer)
        │
        ▼ onFailure
ai_cmo_failed_jobs (Postgres DLQ)
```

---

## Task Routing

| Task type | Router | Target |
|-----------|--------|--------|
| New campaign | L2 POST → Inngest | `campaign-workflow` |
| Underperforming signal | Event bus → Inngest | `event-replan` → Optimizer or Brain |
| Budget threshold | Event bus → Inngest | `budget-guard` → pause campaign |
| Scheduled analytics | Inngest cron | `outcome-ingestion` |
| Approval resolved | L2 webhook → Inngest | Resume `campaign-workflow` at step |

**Agent routing within workflow:**

| Step | Agent | Runtime |
|------|-------|---------|
| Plan | Strategic Brain | Dify → OpenRouter |
| Policy | Policy Engine | Local TS |
| Memory retrieve | — | MemoryRepository |
| Generate | Creator | Dify → OpenRouter |
| Quality | Content Quality Engine | Local TS |
| Evaluate | LLM-as-Judge | OpenRouter |
| Persist | Reconciler | Supabase admin |
| Optimize (async) | Optimizer | Dify → OpenRouter |

---

## Retries

| Layer | Policy |
|-------|--------|
| Inngest step | 3 retries, exponential backoff (default) |
| Dify call | 2 retries inside agent wrapper; then OpenRouter |
| OpenRouter | 1 retry; then circuit breaker |
| Reconciler | 0 retry on validation fail; 2 on transient DB error |
| Redis publish | 3 retries; fallback log + alert |

---

## DLQ (Dead Letter Queue)

| Mechanism | Storage | Action |
|-----------|---------|--------|
| Inngest `onFailure` | `ai_cmo_failed_jobs` table | Admin replay UI |
| Poison event (bus) | `marketing:dlq` Redis stream | Weekly review job |
| Approval timeout | `ai_cmo_approval_requests.status=expired` | Notify + archive |

**Schema proposal (`ai_cmo_failed_jobs`):**

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| workspace_id | UUID | FK |
| workflow_name | TEXT | e.g. campaign-workflow |
| step_name | TEXT | |
| payload | JSONB | |
| error | TEXT | |
| attempts | INT | |
| created_at | TIMESTAMPTZ | |

---

## Idempotency

| Scope | Key format | Store |
|-------|------------|-------|
| Event bus | `{type}:{workspaceId}:{entityId}:{date}` | Redis 7d + optional Postgres |
| Inngest function | `workspace/{workspaceId}/campaign/{campaignId}` | Inngest built-in |
| Reconciler insert | `{table}:{workspaceId}:{hash(content)}` | Check before insert |
| Agent call | `run/{workflowRunId}/{stepId}` | Prevent double token spend |

---

## Scheduling

| Job | Schedule | Function |
|-----|----------|----------|
| MV refresh | `0 * * * *` (hourly) | REFRESH cost + attribution MVs |
| Outcome ingestion | `0 */6 * * *` | Sync analytics → outcomes |
| Optimizer batch | `0 2 * * *` | Daily closed-loop for active campaigns |
| Learning compaction | `0 3 * * 0` | Summarize old learnings |

---

## Implementation Path (Post-Approval)

1. `npm install inngest` — **requires leadership approval** (CL-002)
2. `src/lib/orchestration/inngest-client.ts`
3. `src/app/api/inngest/route.ts`
4. Port `runCampaignWorkflow` steps to `inngest.createFunction`
5. Bridge `MarketingEventBus.subscribe` → `inngest.send`
6. Deprecate `queue:ai-orchestration` BRPOP path
7. Change campaign API to async 202 pattern

---

## Leadership Decision Record

| Question | Recommendation |
|----------|----------------|
| Inngest vs Temporal | **Inngest** for Phase 2–3; re-evaluate Temporal if workflows exceed 24h or need complex saga compensation |
| Inngest Cloud vs self-host | **Cloud** for speed; self-host if data residency mandates |
| Keep Redis Streams? | **Yes** — ingress buffer; Inngest for orchestration state |

**Approval required before Sprint 14 build:** Inngest dependency + Cloud account (or self-host decision).
