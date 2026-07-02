# Feature 004 — Live UAT Verification Guide

**Audience:** QA engineers, Product managers, CTO sign-off  
**Purpose:** Prove the 9.7/10 architecture works in a live staging (or local) environment  
**Prerequisite:** DevOps closure script completed (`scripts/Invoke-Feature004-DevOpsClosure.ps1`)

---

## Quick Start (copy-paste)

**1. Happy path — returns `202 Accepted` + `jobId`:**

```bash
export BASE_URL="http://localhost:3005"
export API_KEY="YOUR_API_KEY"
export BRAND_ID="YOUR_BRAND_UUID"

curl -s -X POST "$BASE_URL/api/v1/ai-cmo/campaigns" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d "{
    \"objective\": \"Launch new summer collection for UAE market — target audience: Women 25-34 interested in fashion\",
    \"brandId\": \"$BRAND_ID\",
    \"locale\": \"ar-AE\",
    \"persona\": \"operator\"
  }"
```

**2. Poll until complete:**

```bash
curl -s "$BASE_URL/api/v1/ai-cmo/campaigns/jobs/YOUR_JOB_ID" -H "x-api-key: $API_KEY"
```

**3. Verify:** Inngest → `campaign-workflow` run | Langfuse → `ai-cmo/agent.strategic_brain` | SQL → `ai_cmo_content_pieces` (see §2).

### Prompt → API field mapping

| UAT prompt field | Actual JSON field | Notes |
|------------------|-------------------|-------|
| `brand_id` | `brandId` | camelCase UUID from `brands` table |
| `target_audience` | *(in `objective`)* | No separate field — embed in objective string |
| Supabase User JWT | `x-api-key` header | This route uses workspace **API key** auth (`api_keys` table) |

---

## 1. Prerequisites Checklist

Complete every item before running Test A (Happy Path).

| # | Check | How to verify |
|---|--------|----------------|
| 1 | **DevOps closure done** | `inngest`, `langfuse`, `@qdrant/js-client-rest` in `package.json`; unit tests green |
| 2 | **Inngest synced** | [Inngest Dashboard](https://app.inngest.com) → app `nexus-ai-cmo` → **4 functions Registered**: `campaign-workflow`, `trigger-replan`, `outcome-ingestion`, `mv-refresh` |
| 3 | **Env vars set** | `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`, `REDIS_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DIFY_API_KEY` (or `OPENROUTER_API_KEY`), `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY` |
| 4 | **Migrations applied** | `RUN_IN_SQL_EDITOR_004_FINAL.sql` executed; RPC `refresh_ai_cmo_materialized_views()` exists |
| 5 | **App running** | `npm run dev` locally **or** staging URL deployed (e.g. `https://staging.nexus.example.com`) |
| 6 | **Valid credentials** | Workspace **API key** (`x-api-key`) — see §1.1. *(Optional: be logged into the Nexus app in a browser to confirm workspace/brand context; the campaign API itself does not accept Supabase session JWT.)* |
| 7 | **Brand ID** | At least one row in `brands` for your test workspace (see §1.2 below) |

### 1.1 Obtain a workspace API key

The campaign API uses **workspace API key auth** (not Supabase session JWT on this route).

```sql
-- Find your test workspace
SELECT id, name FROM workspaces LIMIT 5;

-- List existing API keys (hashed — you need the raw key from creation time)
SELECT id, workspace_id, name, rate_limit_tier, created_at
FROM api_keys
WHERE workspace_id = '<YOUR_WORKSPACE_UUID>';
```

If no key exists, create one via your admin tooling or insert using your project's API key generation flow, then store the **raw key** securely (only the SHA-256 hash is stored in `api_keys.key_hash`).

**Auth headers (use either):**

```
x-api-key: nsk_live_xxxxxxxxxxxxxxxx
```

or

```
Authorization: Bearer nsk_live_xxxxxxxxxxxxxxxx
```

### 1.2 Obtain a brand ID

```sql
SELECT id, name, workspace_id
FROM brands
WHERE workspace_id = '<YOUR_WORKSPACE_UUID>'
LIMIT 5;
```

Copy a `id` value for the request body `brandId` field.

---

## 2. Test A — Happy Path Campaign Request

### What happens when you call this endpoint

1. API validates API key → resolves `workspaceId`
2. Creates a Redis job record (`status: processing`)
3. Emits Inngest event `ai-cmo/campaign.requested`
4. Returns **`202 Accepted`** immediately with `jobId` and `pollUrl`
5. Inngest runs `campaign-workflow` asynchronously (~30–90 seconds):
   ```
   finops-preflight → plan → retrieve-memory → generate → check-uniqueness
     → structured-policy-review → evaluate → persist → link-post
   ```

### Base URL

| Environment | Base URL |
|-------------|----------|
| Local | `http://localhost:3005` |
| Staging | `https://<your-staging-domain>` |

Replace `$BASE_URL` below with your base URL.

---

### cURL — Happy Path

```bash
curl -s -X POST "$BASE_URL/api/v1/ai-cmo/campaigns" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY_HERE" \
  -d '{
    "objective": "Launch new summer collection for UAE market targeting women 25-34 interested in fashion",
    "brandId": "YOUR_BRAND_UUID_HERE",
    "brandName": "Summer Collection UAE",
    "locale": "ar-AE",
    "persona": "operator"
  }'
```

**Expected response (`202 Accepted`):**

```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "pollUrl": "/api/v1/ai-cmo/campaigns/jobs/550e8400-e29b-41d4-a716-446655440000"
}
```

> **Note on request fields:** The API schema uses **camelCase** (`brandId`, `brandName`, `locale`, `persona`). There is no `target_audience` field — include audience details in `objective` (as shown above).

---

### Postman — Happy Path

**Method:** `POST`  
**URL:** `{{baseUrl}}/api/v1/ai-cmo/campaigns`

**Headers:**

| Key | Value |
|-----|-------|
| `Content-Type` | `application/json` |
| `x-api-key` | `{{apiKey}}` |

**Body (raw JSON):**

```json
{
  "objective": "Launch new summer collection for UAE market targeting women 25-34 interested in fashion",
  "brandId": "{{brandId}}",
  "brandName": "Summer Collection UAE",
  "locale": "ar-AE",
  "persona": "operator"
}
```

**Postman environment variables to create:**

| Variable | Example |
|----------|---------|
| `baseUrl` | `http://localhost:3005` |
| `apiKey` | `nsk_live_...` |
| `brandId` | `7c9e6679-7425-40de-944b-e07fc1f90ae7` |
| `jobId` | *(set from 202 response)* |

---

### Step-by-step verification (after 202 response)

#### Step 1 — Poll job status

Wait **5 seconds**, then poll every **10 seconds** for up to **2 minutes**:

```bash
curl -s "$BASE_URL/api/v1/ai-cmo/campaigns/jobs/YOUR_JOB_ID" \
  -H "x-api-key: YOUR_API_KEY_HERE"
```

**Success indicators:**

| `status` | Meaning |
|----------|---------|
| `processing` / `running` | Workflow in progress — keep polling |
| `completed` | Workflow finished — check `result.status` |
| `failed` | Check `error` field |

**Example completed payload:**

```json
{
  "jobId": "...",
  "status": "completed",
  "objective": "Launch new summer collection...",
  "campaignId": "...",
  "result": {
    "status": "published",
    "campaignId": "...",
    "contentId": "...",
    "postId": "..."
  }
}
```

Possible terminal statuses in `result.status`: `published`, `approval_required`, `rejected`, `policy_blocked`.

---

#### Step 2 — Inngest Dashboard

1. Open [Inngest Dashboard](https://app.inngest.com) → **Runs**
2. Filter by function: **`campaign-workflow`**
3. Find the run triggered after your POST (match timestamp / `jobId` in event payload)
4. Confirm step progression:

   ```
   finops-preflight ✓ → plan ✓ → retrieve-memory ✓ → generate ✓
   → check-uniqueness ✓ → structured-policy-review ✓ → evaluate ✓
   → persist ✓ → link-post ✓
   ```

5. If workflow failed at `finops-preflight`, see **Test B (Budget Block)** — you may have a budget cap set.

---

#### Step 3 — Langfuse traces

Open your Langfuse project → **Traces** → filter last 15 minutes.

Look for these trace names (Feature 004 prefixes all traces with `ai-cmo/`):

| Trace name | Agent / step |
|------------|----------------|
| `ai-cmo/agent.strategic_brain` | Strategic Brain — **this is the live equivalent of `ai-cmo/agent.brain.plan`** |
| `ai-cmo/agent.creator` | Creator (generate / revise) |
| `ai-cmo/ai_cmo.strategic_brain.plan` | OTel span (Brain planning) |
| `ai-cmo/ai_cmo.inngest_campaign_workflow` | Full workflow wrapper |

If Langfuse keys are missing, traces appear in server logs as `[langfuse-stub]` — install keys and redeploy for live traces.

---

#### Step 4 — Supabase verification (wait 30–60 seconds after 202)

Replace `<WORKSPACE_UUID>` and `<JOB_ID>` with your values.

**4a. Campaign created via reconciler**

```sql
SELECT id, name, status, objective, brand_id, calibrated_confidence, version, created_at
FROM ai_cmo_campaigns
WHERE workspace_id = '<WORKSPACE_UUID>'
ORDER BY created_at DESC
LIMIT 3;
```

**4b. Content piece inserted**

```sql
SELECT cp.id, cp.campaign_id, cp.locale, cp.content->>'caption' AS caption, cp.created_at
FROM ai_cmo_content_pieces cp
WHERE cp.workspace_id = '<WORKSPACE_UUID>'
ORDER BY cp.created_at DESC
LIMIT 3;
```

**4c. LLM-as-Judge evaluation persisted**

```sql
SELECT e.id, e.content_id, e.overall_quality_score, e.uniqueness_score,
       e.auto_rejected, e.evaluator_model, e.created_at
FROM ai_cmo_evaluations e
JOIN ai_cmo_content_pieces cp ON cp.id = e.content_id
WHERE cp.workspace_id = '<WORKSPACE_UUID>'
ORDER BY e.created_at DESC
LIMIT 3;
```

**4d. FinOps cost ledger entry**

```sql
SELECT agent_name, amount_usd, model_used, token_count, recorded_at
FROM ai_cmo_cost_ledger
WHERE workspace_id = '<WORKSPACE_UUID>'
ORDER BY recorded_at DESC
LIMIT 5;
```

**4e. PII scrubbing on memory tables (optional deep check)**

PII scrubbing runs on reconciler writes to `ai_cmo_learnings`, `ai_cmo_agent_decisions`, and `ai_cmo_strategy_history` — not on `ai_cmo_content_pieces`.

To verify scrubbing after a replan/optimizer run:

```sql
SELECT id, learning_type, context, action, created_at
FROM ai_cmo_learnings
WHERE workspace_id = '<WORKSPACE_UUID>'
ORDER BY created_at DESC
LIMIT 5;
```

Confirm no raw email patterns (`@` + domain) appear in `context` or `action` JSON — values should contain `[PII_REDACTED]` if PII was present in source material.

---

### Test A — Pass criteria

| # | Criterion | Pass |
|---|-----------|------|
| 1 | POST returns `202` with `jobId` | ☐ |
| 2 | Inngest `campaign-workflow` run completes | ☐ |
| 3 | Langfuse shows `ai-cmo/agent.strategic_brain` trace | ☐ |
| 4 | `ai_cmo_campaigns` + `ai_cmo_content_pieces` rows exist | ☐ |
| 5 | `ai_cmo_cost_ledger` has agent cost entries | ☐ |
| 6 | Poll endpoint returns `status: completed` | ☐ |

---

## 3. Test B — Budget Block (FinOps Pre-Flight)

### Purpose

Prove Step 0 (`finops-preflight`) blocks the workflow when the workspace exceeds its monthly AI budget cap.

### Important: `$0.00` cap does NOT block

The budget policy treats `cap_usd <= 0` as **no cap** (allows all spend). Use a **positive cap below current spend** instead.

---

### Setup — SQL (run in Supabase SQL Editor)

Replace `<WORKSPACE_UUID>`.

```sql
-- Step 1: Set a $0.01 monthly workspace cap (blocks any spend >= cap)
INSERT INTO ai_cmo_budget_policies (
  workspace_id, scope, period, cap_usd, action_on_cap
)
VALUES (
  '<WORKSPACE_UUID>', 'workspace', 'monthly', 0.01, 'block'
)
ON CONFLICT DO NOTHING;

-- If a policy already exists, update it:
UPDATE ai_cmo_budget_policies
SET cap_usd = 0.01, action_on_cap = 'block'
WHERE workspace_id = '<WORKSPACE_UUID>'
  AND scope = 'workspace'
  AND period = 'monthly';

-- Step 2: Seed current-month spend above the cap
INSERT INTO ai_cmo_cost_ledger (
  workspace_id, agent_name, cost_category, amount_usd, recorded_at
)
VALUES (
  '<WORKSPACE_UUID>', 'uat-budget-block-seed', 'tokens', 1.00, now()
);
```

---

### cURL — Budget Block Test

Use the **same** campaign POST as Test A:

```bash
curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST "$BASE_URL/api/v1/ai-cmo/campaigns" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY_HERE" \
  -d '{
    "objective": "Budget block UAT test campaign",
    "brandId": "YOUR_BRAND_UUID_HERE",
    "locale": "en-US",
    "persona": "operator"
  }'
```

The API still returns **`202 Accepted`** (job is enqueued). The budget block happens **inside Inngest** at `finops-preflight`.

---

### Verification — Budget Block

#### 1. Poll the job (expect failure within ~10 seconds)

```bash
curl -s "$BASE_URL/api/v1/ai-cmo/campaigns/jobs/YOUR_JOB_ID" \
  -H "x-api-key: YOUR_API_KEY_HERE"
```

**Expected:**

```json
{
  "jobId": "...",
  "status": "failed",
  "error": "Monthly AI budget cap ($0.01) exceeded",
  "result": {
    "status": "rejected",
    "reason": "Monthly AI budget cap ($0.01) exceeded"
  }
}
```

#### 2. Inngest Dashboard

- Open the `campaign-workflow` run
- Confirm it **stops at `finops-preflight`** (subsequent steps not executed)
- Run status: **Failed** or **Completed** with early exit (no `plan` step output)

#### 3. Confirm no new content was created

```sql
SELECT COUNT(*) AS new_pieces
FROM ai_cmo_content_pieces
WHERE workspace_id = '<WORKSPACE_UUID>'
  AND created_at > now() - interval '2 minutes';
```

Expected: **0** new rows (workflow blocked before generate/persist).

---

### Cleanup — restore budget for further testing

```sql
-- Remove UAT cap or restore reasonable limit
UPDATE ai_cmo_budget_policies
SET cap_usd = 100.00
WHERE workspace_id = '<WORKSPACE_UUID>'
  AND scope = 'workspace'
  AND period = 'monthly';

-- Optional: remove seed ledger row
DELETE FROM ai_cmo_cost_ledger
WHERE workspace_id = '<WORKSPACE_UUID>'
  AND agent_name = 'uat-budget-block-seed';
```

---

### Test B — Pass criteria

| # | Criterion | Pass |
|---|-----------|------|
| 1 | POST still returns `202` (async enqueue) | ☐ |
| 2 | Job poll returns `status: failed` with budget message | ☐ |
| 3 | Inngest run stops at `finops-preflight` | ☐ |
| 4 | No new `ai_cmo_content_pieces` after block | ☐ |

---

## 4. Quick Reference

| Item | Value |
|------|-------|
| Create campaign | `POST /api/v1/ai-cmo/campaigns` |
| Poll job | `GET /api/v1/ai-cmo/campaigns/jobs/{jobId}` |
| List campaigns | `GET /api/v1/ai-cmo/campaigns` |
| Auth | `x-api-key` or `Authorization: Bearer <api_key>` |
| Async response | `202 Accepted` |
| Inngest event | `ai-cmo/campaign.requested` |
| Inngest function | `campaign-workflow` |
| Budget step | `finops-preflight` (Step 0) |

---

## 5. Sign-Off

| Role | Name | Date | Tests A / B |
|------|------|------|-------------|
| QA Engineer | | | ☐ / ☐ |
| Product | | | ☐ / ☐ |
| CTO | | | ☐ / ☐ |

**When both tests pass, Feature 004 architecture is live-verified.**

Remaining post-UAT items (not blocking sign-off):

- **UAT-02:** End-to-end publish to live social platform (003 publish worker)

---

## Related documents

- Production deployment: [`004-PRODUCTION-READINESS.md`](./004-PRODUCTION-READINESS.md)
- DevOps closure script: [`../scripts/Invoke-Feature004-DevOpsClosure.ps1`](../scripts/Invoke-Feature004-DevOpsClosure.ps1)
- Authoritative spec: [`../../specs/004-ai-cmo-enterprise/spec.md`](../../specs/004-ai-cmo-enterprise/spec.md)
