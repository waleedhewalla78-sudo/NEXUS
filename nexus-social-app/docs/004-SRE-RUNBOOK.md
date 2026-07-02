# Feature 004 — SRE Incident Runbook

**Audience:** On-call engineers triaging Nexus Social AI CMO (Feature 004) in production.  
**Prerequisite:** Access to Vercel logs, Inngest dashboard, Langfuse, Supabase SQL Editor, Redis CLI.

Every remediation step below maps to code in `nexus-social-app/src/`. Do not invent steps outside this architecture.

---

## Incident Context Schema

Capture these fields in every P1/P2 incident ticket before triage:

| Field | Source | Example |
|-------|--------|---------|
| `jobId` | `POST /api/v1/ai-cmo/campaigns` → `202` body, or poll URL | `660e8400-e29b-41d4-a716-446655440001` |
| `workspaceId` | API auth scope or job record | `550e8400-e29b-41d4-a716-446655440000` |
| `campaignId` | Poll response or Supabase | UUID when created |
| `inngestRunId` | Inngest dashboard → run detail URL | `01J...` |
| `inngestFunctionId` | Inngest function list | `campaign-workflow` |
| `failedStep` | Inngest run → Steps tab | `persist` |
| `langfuseTraceId` | Langfuse trace detail | From trace URL |
| `correlationId` | Reconciler audit metadata (optional) | Passed to `securePatchSoR` |

```typescript
/** Minimum incident context — paste into ticket */
interface AiCmoIncidentContext {
  jobId: string;
  workspaceId: string;
  inngestRunId: string;
  langfuseTraceId?: string;
  inngestFunctionId?: 'campaign-workflow' | 'trigger-replan' | 'outcome-ingestion' | 'mv-refresh';
  failedStep?: string;
  campaignId?: string;
}
```

---

## How to Read an AI Campaign Trace

### Step 1 — Find the job by Job ID

Customer reports a stuck campaign. They received `202 Accepted` with a `jobId`.

```bash
curl -s -H "x-api-key: $WORKSPACE_API_KEY" \
  "https://<domain>/api/v1/ai-cmo/campaigns/jobs/<jobId>"
```

Redis key (TTL 24h): `ai-cmo:job:<jobId>` (`src/lib/ai-cmo/campaign-job-store.ts`).

| `status` | Meaning |
|----------|---------|
| `queued` | Worker has not picked up `queue:ai-cmo-campaigns` yet |
| `processing` / `running` | Workflow in flight |
| `completed` | Terminal success (`result.status === 'published'`) |
| `failed` | Terminal block (`result.status` = `rejected`, `approval_required`, `policy_blocked`, etc.) |

### Step 2 — Get the Inngest Run ID

1. Open Inngest dashboard → App **`nexus-ai-cmo`** (`Inngest({ id: 'nexus-ai-cmo' })`).
2. Open function **`campaign-workflow`** (trigger: `ai-cmo/campaign.requested`).
3. Search runs where event data contains `"jobId": "<jobId>"`.
4. Copy the **Run ID** from the run detail page.
5. Open the **Steps** tab — failed step name matches `step.run()` names (see Error Playbooks below).

Other functions (autonomous loop):

| Function ID | Trigger | When to inspect |
|-------------|---------|-----------------|
| `trigger-replan` | `ai-cmo/campaign.underperforming` | Optimizer / learning loop |
| `outcome-ingestion` | Cron `0 2 * * *` | Daily outcome sync failures |
| `mv-refresh` | Cron `0 * * * *` | FinOps MV stale data |

### Step 3 — Jump to Langfuse

Langfuse traces are prefixed `ai-cmo/` (`src/lib/observability/langfuse-client.ts`).

| Trace name | Created by | Filter |
|------------|------------|--------|
| `ai-cmo/ai_cmo.inngest_campaign_workflow` | `executeCampaignWorkflowSteps` | `metadata.workspaceId`, `sessionId` ≈ workspace |
| `ai-cmo/agent.strategic_brain` | `traceAgentCall` in plan step | `metadata.agentName` |
| `ai-cmo/agent.creator` | Creator agent | Same |
| `ai-cmo/agent.optimizer` | Optimizer (replan) | Same |
| `ai-cmo/ai_cmo.event_replan` | `executeReplanWorkflow` | `campaign_id` attribute |

**Workflow correlation:** `buildCampaignWorkflowDeps` sets `workflowRunId: payload.jobId`. Agent spans set `sessionId` from `traceId ?? jobId`. Search Langfuse by **Session ID = jobId** first.

### Step 4 — Identify the failed step

In Inngest, match the red step to the codebase:

| Step name | Code location | Typical failure |
|-----------|---------------|-----------------|
| `finops-preflight` | `assertBudgetAvailable()` | `BudgetExceededError` |
| `plan` | Strategic Brain agent | LLM / Dify timeout |
| `retrieve-memory` | Memory repository | Qdrant/Postgres read |
| `generate` | Creator agent | ProviderRouter fallback |
| `check-uniqueness` | Uniqueness guard | SEO cannibalization (non-retry) |
| `structured-policy-review` | Policy engine | CRITICAL risk → approval queue |
| `evaluate` | Quality evaluator | Auto-reject |
| `revise-content` | Creator revision | LLM failure |
| `evaluate-retry` | Second evaluation | Quality gate |
| `persist` | `secureSyncToSoR` | Rate limit / reconciler |
| `link-post` | `linkCampaignPostViaReconciler` | 003 posts table write |

---

## Inngest Workflow Step Reference

All `step.run()` names in **`campaign-workflow`** (`src/lib/orchestration/workflows/inngest-campaign-workflow.ts`):

```
finops-preflight
plan
retrieve-memory
generate
check-uniqueness
structured-policy-review
evaluate
revise-content          (conditional)
evaluate-retry          (conditional)
persist
link-post
```

**Note:** `trigger-replan` has no `step.run()` — it executes `executeReplanWorkflow()` as a single unit.

---

## Error Class Playbooks

### 1. `BudgetExceededError` (`code: BUDGET_EXCEEDED`)

**Symptom:** Job returns `failed` immediately; Inngest step `finops-preflight` succeeds but workflow returns `status: rejected`. User sees budget message in `error` field.

**Root cause:** `assertBudgetAvailable()` in `src/lib/finops/budget-guard.ts` reads `ai_cmo_budget_policies` + `ai_cmo_cost_ledger` monthly spend. Throws when cap exceeded. Caught in workflow — does **not** retry.

**Resolution:**

```sql
-- Check current spend vs cap
SELECT SUM(amount_usd) AS spend_mtd
FROM ai_cmo_cost_ledger
WHERE workspace_id = '<workspaceId>'
  AND recorded_at >= date_trunc('month', now());

SELECT cap_usd, action_on_cap, warn_thresholds
FROM ai_cmo_budget_policies
WHERE workspace_id = '<workspaceId>'
  AND scope = 'workspace'
  AND period = 'monthly';
```

Fix options (pick one):

```sql
-- Option A: Raise cap
UPDATE ai_cmo_budget_policies
SET cap_usd = 500.00
WHERE workspace_id = '<workspaceId>' AND scope = 'workspace' AND period = 'monthly';

-- Option B: Insert policy if missing (uses env default AI_CMO_DEFAULT_BUDGET_CAP_USD=100 otherwise)
INSERT INTO ai_cmo_budget_policies (workspace_id, scope, period, cap_usd, action_on_cap)
VALUES ('<workspaceId>', 'workspace', 'monthly', 500.00, 'block');
```

Re-submit campaign via API. **Do not** retry in Inngest — create a new job.

---

### 2. `OptimisticLockError` (`code: OPTIMISTIC_LOCK_CONFLICT`)

**Symptom:** Inngest step `persist` or background patch fails; logs show `Optimistic lock conflict on ai_cmo_*/<id>`. `securePatchSoR` returns `{ ok: false, error: "..." }` instead of throwing.

**Root cause:** `enforceOptimisticLock()` in `src/lib/ai-cmo/utils/secure-reconciler-writer.ts` — concurrent writes with mismatched `expectedVersion` or `expectedUpdatedAt`.

**Resolution:**

1. Read current row version:

```sql
SELECT id, version, updated_at
FROM ai_cmo_campaigns   -- or affected table
WHERE id = '<rowId>' AND workspace_id = '<workspaceId>';
```

2. **Preferred:** Retry Inngest run from failed step (Inngest dashboard → Replay). Workflow will re-read fresh state.

3. **Manual patch (last resort):** Apply SQL directly only if reconciler is stuck and data is known-good:

```sql
UPDATE ai_cmo_campaigns
SET status = 'draft', updated_at = now(), version = COALESCE(version, 0) + 1
WHERE id = '<campaignId>' AND workspace_id = '<workspaceId>';
```

4. For programmatic repair matching reconciler semantics, use service-role script calling `securePatchSoR` with fresh `expectedVersion` — never bypass PII scrubbing in production SQL.

---

### 3. `CircuitOpenError` (`code: CIRCUIT_OPEN`)

**Symptom:** Campaign stuck at `plan` or `generate`; logs show `[ProviderRouter] dify circuit open — falling back`. All agents return `llmStubbed: true`. Quality may fail downstream.

**Root cause:** `src/lib/resilience/circuit-breaker.ts` — 3 consecutive provider failures open circuit for 60s. Redis key pattern: `circuit:{provider}:{model}`.

Known keys:

| Provider | Redis key example |
|----------|-------------------|
| Dify | `circuit:dify:<DIFY_BASE_URL>` |
| OpenRouter | `circuit:openrouter:openai/gpt-4o-mini` |

**Resolution:** See `004-AI-OPS-PLAYBOOK.md` § Circuit Breaker Recovery. After reset, replay Inngest step or submit new campaign.

---

### 4. `ApprovalRequiredError` (`code: APPROVAL_REQUIRED`)

**Symptom:** Job `failed` with `result.status` = `approval_required` or `policy_blocked`. No Inngest error — workflow completed intentionally.

**Root cause:** Defined in `src/lib/governance/errors.ts`. Production workflow does **not** throw this class — it calls `routeToApproval()` which writes `ai_cmo_approval_requests` (`src/lib/orchestration/campaign-workflow-deps.ts`).

**Resolution:**

```sql
SELECT id, severity, status, reason, campaign_id, created_at
FROM ai_cmo_approval_requests
WHERE workspace_id = '<workspaceId>' AND status = 'pending'
ORDER BY created_at DESC
LIMIT 20;
```

Human approves/rejects in admin UI (when wired) or update status:

```sql
UPDATE ai_cmo_approval_requests
SET status = 'approved', decided_at = now(), decided_by = '<userId>'
WHERE id = '<approvalId>' AND workspace_id = '<workspaceId>';
```

Then manually advance campaign or re-submit with adjusted objective. Check `reason` for trigger: uniqueness (`UNIQUENESS_TOO_LOW`), policy CRITICAL tier, hallucination, quality gate.

---

### 5. `AgentRunError` (`code: VALIDATION_ERROR | PROVIDER_UNAVAILABLE | RUNTIME_ERROR`)

**Symptom:** Step fails mid-agent (`plan`, `generate`, `evaluate`); Langfuse trace shows `agent.<name>` error.

**Root cause:** `src/lib/ai-cmo/agents/types/base.ts` — agent input validation or wrapped runtime failure.

**Resolution:**

| Code | Action |
|------|--------|
| `VALIDATION_ERROR` | Fix API payload; check Zod schemas in agent input |
| `PROVIDER_UNAVAILABLE` | Check Dify/OpenRouter env vars; reset circuit breakers |
| `RUNTIME_ERROR` | Read Langfuse trace exception; check Supabase row constraints |

Replay Inngest step after fixing root cause.

---

### 6. Rate limit (not a class — `secureSyncToSoR` / `securePatchSoR` return value)

**Symptom:** `persist` step fails silently or returns `{ ok: false, error: "AI CMO write rate limit exceeded (100/min)" }`.

**Root cause:** `checkAndIncrementAiCmoWriteRate()` — Redis key `workspace:{workspaceId}:ai_cmo_rate`, window 60s, max 100 writes (`AI_CMO_RATE_LIMIT` in `src/lib/ai-cmo/types/reconciler.ts`).

**Resolution:**

```bash
# Wait 60s for window expiry, or flush key (emergency only)
redis-cli DEL "workspace:<workspaceId>:ai_cmo_rate"
```

Investigate runaway loop if rate limit hits repeatedly. Consider pausing bridge: `AI_CMO_REDIS_INNGEST_BRIDGE_ENABLED=false`.

---

### 7. Redis unavailable (fail-closed writes)

**Symptom:** All `ai_cmo_*` writes fail with `Redis unavailable — AI CMO writes blocked (fail-closed)`.

**Root cause:** `secure-reconciler-writer.ts` — no Redis → blocks writes by design.

**Resolution:** Restore Redis connectivity (`REDIS_URL`). Replay affected Inngest runs. Check Vercel + worker Redis connection.

---

## Data Repair — Reconciler Failures

When `secureSyncToSoR` or `securePatchSoR` fails without throwing (returns `{ ok: false }`):

### Diagnose

```sql
-- Recent campaigns stuck without content
SELECT c.id, c.status, c.workspace_id, c.created_at
FROM ai_cmo_campaigns c
LEFT JOIN ai_cmo_content_pieces cp ON cp.campaign_id = c.id
WHERE c.workspace_id = '<workspaceId>'
  AND cp.id IS NULL
  AND c.created_at > now() - interval '24 hours';
```

### Safe repair principles

1. **PII:** All reconciler writes pass `scrubPiiForTableWrite()` — manual SQL must not insert raw emails/phones into `ai_cmo_learnings.context`.
2. **Audit:** Reconciler writes include `auditMetadata` — prefer replay over raw INSERT.
3. **OCC:** Patches require matching `version` — read before write.

### Manual learning insert (Optimizer repair only)

```sql
INSERT INTO ai_cmo_learnings (
  workspace_id, learning_type, context, action, outcome, roi_impact, confidence, validated_by_human
) VALUES (
  '<workspaceId>',
  'channel',
  '{"metric":"ctr"}'::jsonb,
  '{"recommendation":"Verified by human"}'::jsonb,
  '{}'::jsonb,
  -0.1,
  0.9,
  true
);
```

Set `validated_by_human = true` for any manually inserted learning to prevent Brain from treating it as unverified autonomous output.

---

## Inngest Retry & Manual Recovery

| Function | Retries | On permanent failure |
|----------|---------|---------------------|
| `campaign-workflow` | 3 | Check Redis job `ai-cmo:job:<jobId>`; replay or new API request |
| `trigger-replan` | 2 | Check `ai_cmo_learnings` insert count in run output |
| `outcome-ingestion` | 2 | Check cron logs; run `runOutcomeIngestion()` manually in worker |
| `mv-refresh` | 1 | Run `SELECT refresh_ai_cmo_materialized_views();` in SQL |

**Replay procedure:** Inngest dashboard → failed run → **Replay** from failed step (not full re-run if earlier steps succeeded and wrote state).

---

## Escalation Matrix

| Severity | Condition | Escalate to |
|----------|-----------|-------------|
| P1 | All LLM providers circuit-open >15 min | Platform + FinOps |
| P1 | Autonomous loop writing >100 learnings/hour | AI Ops — pause bridge |
| P2 | `mv-refresh` failed 2+ consecutive hours | Data Eng |
| P2 | >10 CRITICAL approvals pending | Compliance owner |
| P3 | Single campaign stuck | On-call SRE (this runbook) |

---

## Related Documents

- Production deploy: `docs/004-PRODUCTION-READINESS.md`
- AI Ops (loops, circuits, SLOs): `docs/004-AI-OPS-PLAYBOOK.md`
- UAT verification: `docs/UAT-004-POSTMAN-COLLECTION.md`

---

## Pentest Incident Response — RLS Bypass in Approvals

If a penetration test confirms an RLS bypass on `ai_cmo_approval_requests`:

1. **Immediately revoke** `SUPABASE_SERVICE_ROLE_KEY` in Supabase dashboard and rotate in all environments.
2. **Route all approval reads** through `createServerComponentClient()` — reference: `src/app/ai-cmo/approvals/page.tsx`. Do not use `supabaseAdmin` for approval inbox reads until RLS policies are verified.
3. Audit cross-tenant rows in `ai_cmo_approval_requests` during the exposure window.
4. Re-run tenant RLS tests: `npm test -- tenant-rls-e2e`.
5. Full pentest scope: `docs/004-PENTEST-SCOPE.md`.
