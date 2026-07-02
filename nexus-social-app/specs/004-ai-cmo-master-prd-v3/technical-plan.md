# Technical Plan — Phase Specifications (Feature 004)

**Feature:** 004 AI CMO Master PRD v3.0  
**Date:** 2026-06-23  
**Parent:** [`plan.md`](./plan.md) (architecture, stack, decision log)  
**Execution tracking:** [`implementation-plan.md`](./implementation-plan.md) · [`IMPLEMENT_PLAN_ALL_OPEN.md`](./IMPLEMENT_PLAN_ALL_OPEN.md)

This document contains **technical how** for Phases A–H. Task IDs and owners live in the open-work plan — not duplicated here.

---

## Phase A — Leadership Gates

### Objective

Unblock dependencies requiring leadership approval and operator action before durable orchestration and scale build.

### Components to build

| Artifact | Path | Status |
|----------|------|--------|
| Decision log updates | `implementation-plan.md` Leadership table | Open |
| Inngest install (post-approval) | `package.json`, `src/lib/orchestration/inngest-client.ts` | Blocked A-GATE-001 |
| Inngest serve route | `src/app/api/inngest/route.ts` | Blocked A-GATE-001 |
| Dify app publish | Dify Studio (operator) | Blocked A-GATE-004 |
| PDPL review checklist | Security sign-off doc (Notion) | Blocked A-GATE-005 |

### Database migrations

None in Phase A. Review draft `000013` and `000014` for leadership sign-off only.

### API contracts

No new APIs. Verify existing:

| Method | Route | Expected |
|--------|-------|----------|
| GET | `/api/health` | 200 |
| POST | `/api/v1/ai-cmo/campaigns` | 202 + `{ jobId, pollUrl }` (Redis interim) |
| GET | `/api/v1/ai-cmo/campaigns/jobs/[jobId]` | Job status poll |

### Worker / orchestration changes

Document fallback in `src/lib/orchestration/README.md` until Inngest approved. No code change required for gate completion.

### External integrations

| Integration | Action |
|-------------|--------|
| Dify | Publish Strategic Brain + Creator apps; set workspace API keys |
| Inngest Cloud | Account provisioning (post A-GATE-001) |
| Langfuse | Self-host vs Cloud decision (A-GATE-002) |

### Testing strategy

```bash
npm run ai:verify          # Must exit 0 after A-GATE-004
npm run verify:staging     # Staging gate
npm run schema:verify:004  # Confirm 11/11 baseline
npm test                   # 94+ passing
```

### Rollout / flags

| Flag / env | Purpose |
|------------|---------|
| `DIFY_API_KEY` | Global fallback key |
| `ai_agent_configs.dify_app_api_key` | Per-workspace override |

### Dependencies on prior phases

Sprint 12–13 complete.

### Exit criteria

- Written approval for Inngest (CL-002), Langfuse, agency schema
- `npm run ai:verify` passes
- PDPL review signed (A-GATE-005)

---

## Phase B — Durable Orchestration

### Objective

Async campaign workflows with retries, event bridge, campaign→post linking, and DLQ — Inngest when approved; Redis worker as interim.

### Components to build

| Component | Path | Task ID |
|-----------|------|---------|
| Inngest client | `src/lib/orchestration/inngest-client.ts` | B-ORCH-001 |
| Inngest serve handler | `src/app/api/inngest/route.ts` | B-ORCH-001 |
| Campaign workflow (Inngest steps) | `src/lib/orchestration/workflows/campaign-workflow.ts` | B-ORCH-002 |
| Workflow deps factory | `src/lib/orchestration/campaign-workflow-deps.ts` | Exists |
| Async campaign API | `src/app/api/v1/ai-cmo/campaigns/route.ts` | B-ORCH-003 **Done** (Redis) |
| Job poll API | `src/app/api/v1/ai-cmo/campaigns/jobs/[jobId]/route.ts` | B-ORCH-003 **Done** |
| Job store | `src/lib/ai-cmo/campaign-job-store.ts` | **Done** |
| Campaign job consumer | `src/jobs/campaign-orchestration.ts` | **Done** |
| Marketing event worker | `src/lib/events/marketing-event-worker.ts` | B-ORCH-004 **Partial** |
| Event consumers | `src/lib/events/marketing-event-consumers.ts` | B-ORCH-004 |
| Event bus | `src/lib/events/marketing-event-bus.ts` | Exists (CL-001) |
| Redis DLQ | `src/lib/events/marketing-event-dlq.ts` | B-ORCH-006 **Partial** |
| Campaign service (post link) | `src/lib/ai-cmo/campaign-service.ts` | B-ORCH-007 |
| Reconciler update path | `src/lib/sync/reconciler.ts` | B-ORCH-007 |
| Worker entrypoint | `src/bin/worker.ts` | B-ORCH-004 |
| Deprecate legacy BRPOP | `src/jobs/ai-orchestration.ts` | B-ORCH-008 |

### Database migrations

| Migration | Tables | Status |
|-----------|--------|--------|
| `20260624_000013_ai_cmo_sprint14_draft.sql` | `ai_cmo_failed_jobs` (optional if Inngest onFailure → Postgres) | Draft |
| Existing `000011`, `000012` | `ai_cmo_campaigns`, hierarchy | **Live** |

### API contracts

| Method | Route | Request | Response |
|--------|-------|---------|----------|
| POST | `/api/v1/ai-cmo/campaigns` | `{ workspaceId, brandId, objective, … }` | `202 { jobId, pollUrl, status: "queued" }` |
| GET | `/api/v1/ai-cmo/campaigns/jobs/[jobId]` | — | `{ status, campaignId?, error?, steps? }` |
| GET | `/api/v1/ai-cmo/campaigns` | `?workspaceId=` | `{ campaigns: Campaign[] }` |
| POST | `/api/inngest` | Inngest webhook (Phase B) | Inngest protocol |

**Inngest events (target):**

| Event | Producer | Consumer |
|-------|----------|----------|
| `campaign.requested` | L2 API | `campaign-workflow` |
| `marketing.campaign.underperforming` | Event bus | `event-replan` |
| `marketing.budget.threshold_hit` | FinOps | `budget-guard` |

### Worker / orchestration changes

```text
POST /campaigns → enqueue (Redis BRPOP or Inngest send)
       │
       ▼
campaign-workflow steps:
  0. checkBudget (D-FinOps)
  1. planStrategy (Brain / Dify)
  2. evaluatePolicy (L4)
  3. retrieveMemory (L5)
  4. generateContent (Creator / Dify)
  5. evaluateQuality (L4)
  6. persistViaReconciler (L7) → post_id
  7. persistEvaluation + confidence
       │
       ▼ onFailure → ai_cmo_failed_jobs OR marketing:dlq
```

Worker loops in `src/bin/worker.ts`:

- `startCampaignJobConsumer()` — BRPOP campaign jobs (interim)
- `startMarketingEventConsumer()` — Redis Streams consumer group
- `startCampaignReplanConsumer()` — underperforming signals
- `worker:heartbeat` — Redis TTL 120s

### External integrations

| System | Role |
|--------|------|
| Inngest Cloud | Workflow state, retries, cron (post-approval) |
| Redis | Streams ingress + interim job queue |
| Dify / OpenRouter | Agent steps inside workflow |
| Supabase | Reconciler writes |

### Testing strategy

```bash
npm test -- src/lib/orchestration
npm test -- src/lib/events
npm test -- src/lib/ai-cmo/campaign-service
npm run worker:dev                    # Manual: POST campaign → poll job
npm run typecheck && npm run build
npm run load-test:ai                  # After async 202 stable
```

### Rollout / flags

| Env | Default | Notes |
|-----|---------|-------|
| `REDIS_URL` | `redis://localhost:6379` | Required for worker |
| Inngest env vars | TBD post-approval | `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` |

Feature flag: keep Redis path until Inngest soak complete; then B-ORCH-008 deprecates `ai-orchestration` BRPOP.

### Dependencies on prior phases

Phase A (Inngest approval for full durability). B-ORCH-007 depends on Feature 003 publish worker (`src/jobs/publish-due-posts.ts`).

### Success metrics

100 concurrent campaigns; p95 workflow < 5 min; 0 lost jobs on worker restart.

---

## Phase C — Memory & Closed Loop

### Objective

Persist learnings, ingest outcomes from analytics, run Optimizer agent, close decision → outcome → lesson loop.

### Components to build

| Component | Path | Task ID |
|-----------|------|---------|
| Memory repository | `src/lib/ai-cmo/memory-repository.ts` | C-MEM-002 **Partial** |
| Optimizer agent | `src/lib/ai-cmo/optimizer-agent.ts` | C-MEM-004 **Partial** |
| Outcome sync job | `src/jobs/ai-cmo/sync-outcomes.ts` (new) | C-MEM-003 |
| Strategy history writes | `strategic-brain.ts`, `optimizer-agent.ts` | C-MEM-006 |
| Vector store abstraction | `src/lib/ai-cmo/vector/` (new) | C-MEM-005 |
| Workflow memory hook | `campaign-workflow-deps.ts` | Exists |

### Database migrations

| Migration | Tables |
|-----------|--------|
| `000013` (apply) | `ai_cmo_decision_ledger`, `ai_cmo_agent_decisions`, `ai_cmo_experiments` |
| Existing `000012` | `ai_cmo_learnings`, `ai_cmo_campaign_outcomes`, `ai_cmo_strategy_history` |

### API contracts

Internal only (no new public routes in Phase C). Optimizer triggered via worker cron or Inngest `optimizer-loop`.

| Job | Input | Output |
|-----|-------|--------|
| `sync-outcomes` | `post_analytics` rows for campaign `post_id` | `ai_cmo_campaign_outcomes` insert via reconciler |
| `optimizer-agent` | Completed campaign + outcome | `ai_cmo_learnings` row via reconciler |

### Worker / orchestration changes

| Schedule | Job | Function |
|----------|-----|----------|
| `0 */6 * * *` | Outcome ingestion | `sync-outcomes.ts` |
| `0 2 * * *` | Optimizer batch | `optimizer-agent.ts` |
| Event: `campaign.completed` | Optimizer trigger | Inngest or worker consumer |

### External integrations

| System | Role |
|--------|------|
| Qdrant | Semantic retrieval on learnings (C-MEM-005) — optional |
| pgvector | Fallback if Qdrant deferred |
| Dify | Optimizer agent runtime |

### Testing strategy

```bash
npm test -- src/lib/ai-cmo/memory-repository
npm test -- src/lib/ai-cmo/optimizer-agent
npm run schema:verify:004    # After 000013 applied
npm run worker:dev           # Trigger outcome sync manually
```

### Rollout / flags

| Env | Purpose |
|-----|---------|
| `QDRANT_URL` | Phase C optional — document in `.env.example` when added |
| Cold-start | Empty memory → Brain uses default prompts (no flag) |

### Dependencies on prior phases

Phase B (B-ORCH-007 `post_id` for outcome correlation).

### Success metrics

80% active campaigns have outcomes within 48h; ≥1 learning per completed campaign.

---

## Phase D — FinOps & Attribution Runtime

### Objective

Token/cost tracking, budget caps, attribution event ingestion, materialized view refresh.

### Components to build

| Component | Path | Task ID |
|-----------|------|---------|
| Cost ledger | `src/lib/ai-cmo/finops/cost-ledger.ts` | D-FIN-002 **Partial** |
| Budget policy | `src/lib/ai-cmo/finops/budget-policy.ts` | D-FIN-003 **Partial** |
| MV refresh job | `src/jobs/ai-cmo/refresh-mvs.ts` (new) | D-FIN-004 |
| Attribution ingestion | reconciler → `ai_cmo_attribution_events` | D-FIN-005 |
| Unified cost MV | SQL in migration | D-FIN-006 |
| Agent cost hooks | `strategic-brain.ts`, `creator-agent.ts` | D-FIN-002 |

### Database migrations

| Migration | Tables / objects |
|-----------|------------------|
| `000013` (apply) | `ai_cmo_budget_policies`, token usage extensions |
| Existing `000012` | `ai_cmo_cost_ledger`, `ai_cmo_cost_summary` (MV), `ai_cmo_attribution_events`, `ai_cmo_attribution_summary` (MV) |

### API contracts

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/v1/ai-cmo/finops/summary` (new, Phase D) | Workspace cost rollup |
| Internal | Pre-flight in workflow step 0 | `checkBudgetPolicy(workspaceId)` → block if over cap |

Attribution events schema:

```typescript
// Written via reconciler only
{
  workspace_id: UUID,
  campaign_id?: UUID,
  post_id?: UUID,
  event_type: 'utm_click' | 'conversion' | 'webhook',
  payload: JSONB,
  occurred_at: TIMESTAMPTZ
}
```

### Worker / orchestration changes

| Schedule | Job |
|----------|-----|
| `0 * * * *` | `REFRESH MATERIALIZED VIEW ai_cmo_cost_summary, ai_cmo_attribution_summary` |

Pre-flight budget check at orchestration step 0 (before any Dify call).

### External integrations

| System | Role |
|--------|------|
| Stripe | 003 `ai_credit_ledger` — unified MV joins credits + cost (D-FIN-006) |
| CRM webhook | `CRM_WEBHOOK_URL` — optional attribution source |

### Testing strategy

```bash
npm test -- src/lib/ai-cmo/finops
npm run schema:verify:004
npm run worker:dev    # Verify MV refresh log line
```

### Rollout / flags

| Env | Purpose |
|-----|---------|
| Budget policies in DB | Per-workspace caps in `ai_cmo_budget_policies` |
| `checkBudgetPolicy` | Graceful no-op if table missing (interim) |

### Dependencies on prior phases

Phase B (workflow step 0 hook). D-FIN-005 depends on B-ORCH-007.

### Success metrics

100% agent calls logged; 0 workflows start over budget cap.

---

## Phase E — Governance & Quality Hardening

### Objective

Risk-based approval queue, LLM-as-Judge, structured policy pipeline, MENA PDPL rules, confidence persistence.

### Components to build

| Component | Path | Task ID |
|-----------|------|---------|
| Policy engine | `src/lib/governance/policy-engine.ts` | E-GOV-003 |
| Content quality engine | `src/lib/quality/content-quality-engine.ts` | E-GOV-006 |
| Calibrated confidence | `src/lib/evaluation/calibrated-confidence.ts` | E-GOV-007 **Partial** |
| LLM-as-Judge job | `src/jobs/ai-cmo/llm-judge.ts` (new) | E-GOV-004 |
| Approval API | `src/app/api/v1/ai-cmo/approvals/` (new) | E-GOV-001 |
| Approval inbox UI | `src/app/(dashboard)/ai-cmo/approvals/` (new) | E-GOV-008 |
| PII scrubber | `src/lib/governance/pii-scrubber.ts` (new) | E-GOV (PDPL) |
| Evaluation persist | `campaign-workflow-deps.ts` | **Partial** |

### Database migrations

| Migration | Tables |
|-----------|--------|
| `000013` (apply) | `ai_cmo_approval_requests`, eval dimension extensions on `ai_cmo_evaluations` |

### API contracts

| Method | Route | Request | Response |
|--------|-------|---------|----------|
| GET | `/api/v1/ai-cmo/approvals` | `?workspaceId=&status=pending` | `{ requests: ApprovalRequest[] }` |
| POST | `/api/v1/ai-cmo/approvals/[id]/resolve` | `{ action: "approve" \| "reject", note? }` | `{ status }` |
| POST | `/api/v1/ai-cmo/confidence` | Existing | Calibrated score |

Policy tiers: LOW → auto; MED → log; HIGH → approval queue; CRITICAL → block + mandatory human.

### Worker / orchestration changes

- Workflow pause at approval step (Inngest `step.waitForEvent` or Redis poll)
- LLM-as-Judge runs post-Creator, pre-reconciler persist
- Resume on `approval.resolved` event

### External integrations

None beyond OpenRouter for Judge model.

### Testing strategy

```bash
npm test -- src/lib/governance
npm test -- src/lib/quality
npm test -- src/lib/evaluation
npm run schema:verify:004
```

### Rollout / flags

| Control | Behavior |
|---------|----------|
| `APPROVAL_HMAC_SECRET` | Webhook signature for approval callbacks |
| Policy fail-closed | Engine error → HIGH tier + block |

### Dependencies on prior phases

Phase B (workflow pause/resume). C-MEM-004 helpful for learning from rejections.

### Success metrics

0% CRITICAL auto-publish; Judge–human agreement > 85%.

---

## Phase F — Observability & Resilience

### Objective

Langfuse LLM traces, circuit breakers, AI Ops dashboard, Redis lag monitoring, per-workspace rate limits.

### Components to build

| Component | Path | Task ID |
|-----------|------|---------|
| OTel instrumentation | `src/lib/telemetry/` (extend) | F-OBS-001 |
| Langfuse client | `src/lib/telemetry/langfuse.ts` (new) | F-OBS-002 |
| Circuit breaker | `src/lib/resilience/circuit-breaker.ts` (new) | F-OBS-004 |
| AI Ops dashboard | `src/app/(dashboard)/admin/ai-ops/` (new) | F-OBS-005 |
| Stream lag monitor | `src/jobs/ai-cmo/monitor-stream-lag.ts` (new) | F-OBS-006 |
| Rate limiter | `src/lib/cache/rate-limit.ts` (extend) | F-OBS-007 |
| Sentry boundaries | Agent wrappers | F-OBS-003 |

### Database migrations

Optional: agent metrics aggregation table if not served from Langfuse/OTel backends.

### API contracts

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/v1/admin/ai-ops/metrics` | Agent latency, error rate, token spend |
| GET | `/api/v1/admin/ai-ops/dlq` | Failed jobs / poison events |

### Worker / orchestration changes

- OTel spans at every L3 step boundary and L6 agent call
- Langfuse trace per Dify/OpenRouter invocation
- Circuit breaker wraps Dify → OpenRouter fallback chain

### External integrations

| System | Role |
|--------|------|
| Langfuse | LLM trace storage (A-GATE-002) |
| OTEL Collector | `docker-compose.prod.yml` otel-collector :4318 |
| Sentry | Error aggregation |

### Testing strategy

```bash
npm run otel:verify
npm test -- src/lib/resilience    # When added
npm run verify:staging
```

### Rollout / flags

| Env | Purpose |
|-----|---------|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Trace export |
| `LANGFUSE_*` | TBD post A-GATE-002 |
| `SENTRY_DSN` | Production errors |

### Dependencies on prior phases

Phase B (step boundaries). A-GATE-002 for Langfuse.

### Success metrics

MTTR < 30 min for P1; 100% agent path trace coverage.

---

## Phase G — Agent Mesh Expansion

### Objective

Radar, Channel Risk, Finance, Portfolio S&OP, Quant, Sentinel — event-driven replanning production.

### Components to build

| Agent | Path | Task ID |
|-------|------|---------|
| Radar | Extend `src/jobs/sync-listening.ts` → event bus | G-AGENT-001 |
| Channel Risk | `src/lib/ai-cmo/channel-risk-agent.ts` (new) | G-AGENT-002 |
| Quant | `src/lib/ai-cmo/quant-agent.ts` (new) | G-AGENT-003 |
| Sentinel | `src/lib/ai-cmo/sentinel-agent.ts` (new) | G-AGENT-004 |
| Finance | `src/lib/ai-cmo/finance-agent.ts` (new) | G-AGENT-005 |
| Portfolio S&OP | `src/lib/ai-cmo/portfolio-sop.ts` (new) | G-AGENT-006 |
| Event replan | `marketing-event-consumers.ts` + Inngest | G-AGENT-007 |

### Database migrations

May extend `000013` or new `000015` for agent-specific tables if needed.

### API contracts

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/v1/ai-cmo/radar/signals` | Recent competitor/listening signals |
| GET | `/api/v1/ai-cmo/channel-risk/heatmap` | Platform risk scores |
| GET | `/api/v1/ai-cmo/portfolio/scenarios` | S&OP what-if |

### Worker / orchestration changes

- Radar publishes `marketing.competitor.signal` → Brain memory retrieval
- Underperforming → `event-replan` Inngest function
- Finance reads Stripe pipeline (003 baseline)

### External integrations

| System | Role |
|--------|------|
| Dify | Agent runtime per agent type |
| Stripe | Finance agent pipeline data |
| 003 listening/reputation | Radar signal sources |

### Testing strategy

```bash
npm test -- src/lib/ai-cmo
npm test -- src/lib/events/marketing-event-consumers
npm run worker:dev
```

### Rollout / flags

FinOps caps (Phase D) MUST be active before Phase G production — prevents agent cost multiplication.

### Dependencies on prior phases

Phases C, D, F complete. B-ORCH-005 for event replan.

### Success metrics

Radar→replan latency < 5 min; 3+ agent types invoked per campaign.

---

## Phase H — Productization & Launch

### Objective

Agency hierarchy, tenant/brand UI, E2E smoke, DR drill, load test, production sign-off.

### Components to build

| Component | Path | Task ID |
|-----------|------|---------|
| Agencies migration | `supabase/migrations/20260624_000014_agencies_hierarchy_draft.sql` | H-PROD-001 |
| Tenant/brand picker | `src/components/ai-cmo/TenantBrandPicker.tsx` (new) | H-PROD-002 |
| Settings hierarchy UI | `src/app/(dashboard)/settings/hierarchy/` (new) | H-PROD-002 |
| Explainability white-label | `src/lib/explainability/renderer.ts` | H-PROD-003 |
| AI CMO E2E smoke | `e2e/ai-cmo-campaign.spec.ts` (new) | H-PROD-004 |
| Launch checklist | `checklists/launch-readiness.md`, `LAUNCH_CHECKLIST.md` | H-PROD-005 |
| DR runbook | `architecture-audit/13-disaster-recovery.md` | H-PROD-006 |
| Load test | `load-tests/ai-cmo-concurrent-workspaces.js` (new) | H-PROD-007 |

### Database migrations

| Migration | Changes |
|-----------|---------|
| `000014` (apply) | `agencies` table, `brands.agency_id`, backfill default agency per tenant |

### API contracts

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/v1/ai-cmo/hierarchy` | Tenant → agency → brand tree |
| CRUD | `/api/v1/ai-cmo/brands` | Brand management |

### Worker / orchestration changes

Redis HA / Sentinel config documented in DR runbook (H-PROD-006). No new worker loops.

### External integrations

Full-stack compose (003 Epic 4): Chatwoot, Dify, Activepieces for launch UAT.

### Testing strategy

```bash
npm run test:smoke
npx playwright test e2e/ai-cmo-campaign.spec.ts   # H-PROD-004
npm run verify:local
npm run verify:staging
npm run preflight
npm run walkthrough                                  # T056
npm run load-test:ai                                 # H-PROD-007 baseline
k6 run load-tests/ai-cmo-concurrent-workspaces.js  # When added
```

### Rollout / flags

| Control | Notes |
|---------|-------|
| A-GATE-003 | Required before 000014 apply |
| `NEXT_PUBLIC_SAML_ENABLED` | Enterprise SSO optional |
| Feature flags per workspace | Agency tier gating |

### Dependencies on prior phases

Phases D, E, F; G partial. 003 launch track parallel (T053–T057).

### Success metrics

500 workspace load test pass; DR RTO validated; launch checklist 100%.

---

## Feature 003 Integration Plan

Feature 003 (`specs/003-real-integrations-production/plan.md`) owns production SMM integrations. Feature 004 wires AI CMO to 003 without regression.

### Publish worker integration

```text
campaign-workflow (004)
       │
       ▼
reconciler.syncToSoR({ table: 'posts', … })     ← creates scheduled post
       │
       ▼
reconciler.updateSoR({ ai_cmo_campaigns.post_id }) ← B-ORCH-007
       │
       ▼
publish-due-posts (003 worker)                    ← unchanged
       │
       ▼
PublisherAdapter → Meta / LinkedIn / X
```

**Files (003 — do not modify in 004 unless cross-feature task):**

- `src/jobs/publish-due-posts.ts`
- `src/lib/publishing/` adapters
- `src/app/api/oauth/*/callback/route.ts`

**Files (004 — integration point):**

- `src/lib/ai-cmo/campaign-service.ts` — orchestrates campaign + post creation
- `src/lib/sync/reconciler.ts` — atomic campaign + post writes

### Analytics integration

```text
sync-analytics (003) → post_analytics
       │
       ▼
sync-outcomes (004, C-MEM-003) → ai_cmo_campaign_outcomes
       │
       ▼
Optimizer (004) → ai_cmo_learnings
       │
       ▼
attribution ingestion (004, D-FIN-005) → ai_cmo_attribution_events
```

**003 files:** `src/jobs/sync-analytics.ts`, `post_analytics` table  
**004 files:** `src/jobs/ai-cmo/sync-outcomes.ts` (new), reconciler writes

No changes to 003 analytics RPCs or dashboard queries.

### OAuth integration

004 does **not** implement OAuth. Campaign publish uses existing `workspace_social_connections` populated by 003 OAuth flow.

Env vars (003): `META_*`, `LINKEDIN_*`, `X_*`, `TOKEN_ENCRYPTION_KEY`

### Activepieces integration

Post-publish webhooks remain 003-owned (`ACTIVEPIECES_WEBHOOK_URL`). 004 may emit `sor.content.persisted` events for future automation triggers — subscribe via marketing event bus, not direct webhook changes.

### Shared AI (Dify)

| Concern | 003 | 004 |
|---------|-----|-----|
| Dify verify | `npm run ai:verify` | Same script |
| App types | Market analysis, captions | Strategic Brain, Creator |
| Config | `ai_agent_configs` | Per-workspace `dify_app_api_key` |
| Fallback | OpenRouter | OpenRouter (CL-005) |

### Regression test gate

Every 004 PR must pass:

```bash
npm run typecheck && npm test && npm run schema:verify
```

003-specific before release:

```bash
npm run verify:staging && npm run preflight
```

---

## Security & Compliance Plan

### Row-Level Security (RLS)

| Table group | Policy pattern |
|-------------|----------------|
| `ai_cmo_*` | `workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())` |
| Hierarchy (`tenants`, `brands`) | Join through `workspaces.tenant_id` + membership |
| `agencies` (000014) | Agency admin role + workspace membership union |

**Test:** RLS unit tests for cross-tenant leak (R7 in `analysis.md`).

### Reconciler (mandatory SoR path)

All mutations to:

- `ai_cmo_campaigns`, `ai_cmo_content_pieces`, `ai_cmo_learnings`
- `ai_cmo_cost_ledger`, `ai_cmo_attribution_events`
- `ai_cmo_evaluations`, `ai_cmo_approval_requests`
- `posts` (when created from AI CMO)

Must call `syncToSoR()` or `updateSoR()` in `src/lib/sync/reconciler.ts`.

**Validation:** Schema + business rules before write; RLS check; audit log entry.

### PDPL hooks (MENA)

| Phase | Control |
|-------|---------|
| A-GATE-005 | Security review of memory/FinOps data flows |
| E-GOV-003 | MENA rules in `policy-engine.ts` (data residency, consent language) |
| E-GOV (PII) | `pii-scrubber.ts` before `ai_cmo_learnings` persist |
| F-OBS-002 | Langfuse trace scrubbing — no PII in spans |

### Human approval

CRITICAL content never reaches publish worker without `ai_cmo_approval_requests.status = approved`.

### Secrets

| Secret | Scope |
|--------|-------|
| `SUPABASE_SERVICE_ROLE_KEY` | Worker + reconciler only |
| `TOKEN_ENCRYPTION_KEY` | 003 OAuth — not used by 004 agents |
| `INTERNAL_TOOL_SECRET` | Internal API routes |
| `APPROVAL_HMAC_SECRET` | Approval webhook signatures |

---

## Infrastructure Plan

### Development stack

```bash
# Redis
docker compose -f docker-compose.redis.yml up -d

# App
cp .env.example .env.local   # fill Supabase, Redis, Dify keys
npm run dev                  # :3005

# Worker (separate terminal)
npm run worker:dev

# Optional OTel
docker compose -f docker-compose.otel.yml up -d
```

### Production stack (`docker-compose.prod.yml`)

| Service | Image / command | Port |
|---------|-----------------|------|
| `web` | `nexus-social-app:prod` | `${APP_PORT:-3000}` |
| `worker` | `node dist/bin/worker.js` | — |
| `redis` | `redis:alpine` AOF | 6379 |
| `otel-collector` | `otel/opentelemetry-collector-contrib` | 4318 |

Deploy: `npm run start:staging` → `docker compose -f docker-compose.prod.yml up -d --build`

### Supabase

| Concern | Approach |
|---------|----------|
| Migrations | `supabase/migrations/20260624_0000{11,12,13,14}_*.sql` |
| Apply local | `npm run db:migrate:local` or SQL Editor |
| Verify 004 | `npm run schema:verify:004` |
| Verify 003 | `npm run schema:verify` |
| RLS | Enabled on all `ai_cmo_*` tables |

### Dify

| Mode | Config |
|------|--------|
| Cloud | `DIFY_BASE_URL=https://api.dify.ai` |
| Self-host | Internal Docker service URL (003 full-stack compose) |
| Per-workspace | `ai_agent_configs.dify_app_api_key` overrides env |

Verify: `npm run ai:setup` (dev) · `npm run ai:verify` (gate)

### Redis topology

| Key / stream | Purpose |
|--------------|---------|
| `marketing:events` | Event bus stream (CL-001) |
| `marketing:dlq` | Poison message DLQ |
| `worker:heartbeat` | Health TTL 120s |
| `queue:ai-orchestration` | Legacy BRPOP — deprecate Phase B |
| Campaign job queue | Redis list/BRPOP (interim async API) |

Phase H: Redis Sentinel / replica for HA (H-PROD-006).

### Optional full-stack compose (003 Epic 4)

Unifies Chatwoot (:3003), Activepieces (:8080), Dify for end-to-end UAT:

- `npm run live:stack`
- `npm run walkthrough`
- `npm run demo:verify`

### CI (GitHub Actions)

```bash
npm run ci
# = npm ci && npm run lint && npm test && npm run e2e:validate && npm run otel:verify
```

Add Inngest dev smoke and `schema:verify:004` to CI when 000013 lands (T054).

---

## Testing Matrix (All Phases)

| Scope | Command | When |
|-------|---------|------|
| Unit (all) | `npm test` | Every PR |
| Typecheck | `npm run typecheck` | Every PR |
| Build | `npm run build` | Every PR |
| Lint | `npm run lint` | Every PR |
| 003 schema | `npm run schema:verify` | 003 migration changes |
| 004 schema | `npm run schema:verify:004` | After 000013+ applied |
| AI gate | `npm run ai:verify` | Staging / post Dify publish |
| Staging | `npm run verify:staging` | Pre-release |
| Local full | `npm run verify:local` | Dev confidence |
| OTel | `npm run otel:verify` | Observability changes |
| Worker manual | `npm run worker:dev` | B/C/D worker jobs |
| 003 E2E smoke | `npx playwright test e2e/smoke.spec.ts` | 003 launch |
| 004 E2E smoke | `npx playwright test e2e/ai-cmo-campaign.spec.ts` | Phase H |
| Load AI | `npm run load-test:ai` | Phase B/H |
| Preflight | `npm run preflight` | Production |
| Walkthrough | `npm run walkthrough` | T056 UAT |
| CI bundle | `npm run ci` | GitHub Actions |

---

## Document History

| Date | Change |
|------|--------|
| 2026-06-23 | Initial technical plan via `/speckit.plan` — Phases A–H, 003 integration, security, infra |
