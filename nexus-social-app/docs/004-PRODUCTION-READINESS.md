# Feature 004 — Production Readiness Checklist

Step-by-step guide for deploying the Nexus Social AI CMO to production.  
Audience: DevOps / SRE engineers with access to Vercel, Supabase, and Redis.

**Prerequisite:** Feature 003 (OAuth, publish workers, `post_analytics`) must already be deployed.

---

## 1. Install NPM Dependencies

From `nexus-social-app/`:

```bash
npm install inngest langfuse @qdrant/js-client-rest
```

These packages unlock:
- **inngest** — durable L3 orchestration (`campaign-workflow`, `trigger-replan`, crons)
- **langfuse** — AI ops tracing (`src/lib/observability/langfuse-client.ts`)
- **@qdrant/js-client-rest** — optional hybrid vector memory (Postgres remains primary)

Verify TypeScript compiles after install:

```bash
npm run build
```

---

## 2. Configure Environment Variables

Add to Vercel (Production + Preview) and `.env.local`:

```env
# Inngest (required for async workflows)
INNGEST_EVENT_KEY=your-inngest-event-key
INNGEST_SIGNING_KEY=your-inngest-signing-key

# Supabase admin (required for workers + MV refresh)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Redis (required — rate limits, circuit breakers, job store)
REDIS_URL=redis://...

# LLM providers (at least one required)
DIFY_BASE_URL=https://api.dify.ai
DIFY_API_KEY=app-your-dify-key
OPENROUTER_API_KEY=sk-or-...

# Langfuse (recommended)
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_BASE_URL=https://cloud.langfuse.com

# Qdrant (optional — memory hybrid search)
QDRANT_URL=https://your-cluster.qdrant.io
QDRANT_API_KEY=...

# 003 Redis bridge (optional override)
MARKETING_EVENTS_STREAM_KEY=marketing:events
MARKETING_EVENTS_CONSUMER_GROUP=marketing:workers
```

---

## 3. Set Up Inngest on Vercel

1. Create an Inngest account at [https://www.inngest.com](https://www.inngest.com).
2. Create an app named **`nexus-ai-cmo`** (matches `Inngest({ id: 'nexus-ai-cmo' })`).
3. Copy **Event Key** and **Signing Key** into Vercel env vars.
4. In Inngest dashboard → **Apps** → **Sync** → point to:
   ```
   https://your-domain.com/api/inngest
   ```
5. Confirm these functions appear after deploy:
   - `campaign-workflow`
   - `trigger-replan`
   - `outcome-ingestion` (cron: daily 02:00 UTC)
   - `mv-refresh` (cron: hourly)

**Smoke test:** Send a test event `ai-cmo/campaign.requested` from Inngest dashboard with a valid payload (see `src/lib/orchestration/types/campaign-workflow.ts`).

---

## 4. Run Database Migrations

### Prerequisites

Ensure Feature 003 baseline and **000012** are applied:

```text
supabase/migrations/20260624_000012_ai_cmo_foundation.sql
```

### Option A — Supabase CLI (recommended)

```bash
cd nexus-social-app
supabase db push
```

### Option B — SQL Editor (manual)

Run in Supabase SQL Editor **in order**:

1. `supabase/migrations/20260624_000013_ai_cmo_sprint14_draft.sql`
2. `supabase/migrations/20260624_000014_agencies_hierarchy.sql`

Or run the combined file:

```text
supabase/migrations/RUN_IN_SQL_EDITOR_004_FINAL.sql
```

### Verify tables exist

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'ai_cmo_%'
ORDER BY 1;
```

Expected additions from 000013/000014 include:
- `ai_cmo_decision_ledger`
- `ai_cmo_agent_decisions`
- `ai_cmo_experiments`
- `ai_cmo_memory_summaries`
- `ai_cmo_approval_requests`
- `ai_cmo_budget_policies`
- `agencies`
- `agency_members`

---

## 5. Create / Verify MV Refresh RPC

Migration 000013 creates:

```sql
SELECT refresh_ai_cmo_materialized_views();
```

Verify it exists:

```sql
SELECT proname FROM pg_proc WHERE proname = 'refresh_ai_cmo_materialized_views';
```

This RPC is called hourly by the `mv-refresh` Inngest cron and refreshes:
- `ai_cmo_cost_summary`
- `ai_cmo_attribution_summary`

**Note:** Materialized views must exist (created in 000012). If missing, apply 000012 first.

Manual test:

```sql
SELECT refresh_ai_cmo_materialized_views();
```

---

## 6. Set Up Langfuse Project

1. Create project at [https://cloud.langfuse.com](https://cloud.langfuse.com).
2. Copy **Public Key** and **Secret Key** to env vars.
3. Traces appear with prefix `ai-cmo/` (see `langfuse-client.ts`).
4. PII is scrubbed from trace payloads before export (emails, phones).

---

## 7. Deploy Application

```bash
git push origin main
# Vercel auto-deploys, or:
vercel --prod
```

Post-deploy checks:

| Check | How |
|-------|-----|
| Inngest sync | Inngest dashboard shows 4 functions |
| API health | `GET /api/inngest` returns 200 |
| Redis connected | Campaign job store accepts writes |
| Dify/OpenRouter | Run a test campaign via API or UI |

---

## 8. Enable Redis → Inngest Bridge (INT-01 — wired in worker)

The bridge starts automatically with the background worker when `AI_CMO_REDIS_INNGEST_BRIDGE_ENABLED` is not `false` (default: enabled).

```bash
# Start worker (includes Redis→Inngest bridge + 003 publish/analytics loops)
npm run worker
# or: npx tsx src/bin/worker.ts
```

Verify logs contain:

```
[Worker] Starting Redis→Inngest bridge (004 autonomous loop)...
[redis-inngest-bridge] started { stream: 'marketing:events', bridgeConsumerGroup: 'marketing:inngest-bridge', ... }
```

Underperforming campaigns flow:

```
marketing.campaign.underperforming (Redis)
  → marketing:inngest-bridge consumer
  → ai-cmo/campaign.underperforming (Inngest)
  → trigger-replan → OptimizerAgent → ai_cmo_learnings
```

Disable bridge only if needed: `AI_CMO_REDIS_INNGEST_BRIDGE_ENABLED=false`

---

## 9. Security & Compliance Verification

| Control | Location | Verify |
|---------|----------|--------|
| PII scrubbing on memory writes | `secure-reconciler-writer.ts` + `pii-scrubber.ts` | No raw emails in `ai_cmo_learnings.context` |
| Rate limit (100 writes/min/workspace) | `secure-reconciler-writer.ts` | Exceeding limit returns error |
| Budget pre-flight | `budget-guard.ts` | Over-cap campaigns blocked |
| Agency RLS | Migration 000014 | Cross-tenant SELECT denied |
| Data residency | `data-residency.ts` | MENA/EU tenants block non-compliant LLM routing |

Run unit tests:

```bash
npm test -- --run src/lib/governance src/lib/ai-cmo/utils
```

---

## 10. Monitoring & Alerts (Recommended)

| Signal | Source | Alert threshold |
|--------|--------|-----------------|
| Campaign workflow failures | Inngest dashboard | >5 failures/hour |
| MV refresh failures | `mv-refresh` cron logs | 2 consecutive failures |
| Circuit breaker open | Redis key `circuit:*` | Any OPEN state >5 min |
| Budget cap hits | `ai_cmo_cost_ledger` | 80% of monthly cap |
| Approval queue backlog | `ai_cmo_approval_requests` | >10 pending CRITICAL |

---

## Rollback Plan

1. **Disable Inngest functions** — pause in Inngest dashboard (no new workflows).
2. **Revert Vercel deployment** — previous release without 004 routes.
3. **Database** — 000013/000014 are additive; rollback is optional. Do NOT drop `ai_cmo_*` tables if data exists.

---

## Support References

- Authoritative spec: `specs/004-ai-cmo-enterprise/spec.md`
- AI incident runbook: `docs/AI_INCIDENT_RUNBOOK.md`
- Deployment baseline: `DEPLOYMENT.md`

---

## Runbook References (Operational Readiness)

Feature 004 code is complete. Use these playbooks for on-call and AI Ops after go-live:

| Document | Purpose |
|----------|---------|
| [`docs/004-SRE-RUNBOOK.md`](./004-SRE-RUNBOOK.md) | Incident triage: Job ID → Inngest Run ID → Langfuse trace; error-class playbooks (`BudgetExceededError`, `OptimisticLockError`, `CircuitOpenError`, etc.); reconciler data repair |
| [`docs/004-AI-OPS-PLAYBOOK.md`](./004-AI-OPS-PLAYBOOK.md) | Autonomous loop health (`XINFO GROUPS` on `marketing:inngest-bridge`); Optimizer runaway kill switch; circuit breaker reset; SLO metrics and alert thresholds |

**Incident context minimum:** `jobId`, `workspaceId`, `inngestRunId`, `langfuseTraceId`, `failedStep` (see SRE runbook schema).

**Post-launch engineering:** Deferred PRD items (agent mesh expansion, Qdrant, pentest) → [`docs/004-POST-LAUNCH-BACKLOG-S15-S17.md`](./004-POST-LAUNCH-BACKLOG-S15-S17.md).

**Project closure (V1.0 locked):** [`docs/004-PROJECT-CLOSED-V1.md`](./004-PROJECT-CLOSED-V1.md) — immutable manifest; AI build pipeline terminated.
