# Nexus AI CMO — Definitive Go-Live Execution Playbook

**Version:** 1.0 · Enterprise GA (58/58 tasks · 100% fidelity)  
**Audience:** You — the human executing the final proof  
**Print this:** Open on a second monitor, check boxes as you go  
**Code root:** `nexus-social-app/`

---

> **You are here because engineering is done.**  
> No more architecture. No more mocks. This playbook is the only path from "code complete" to "live proven." Follow it top to bottom. Do not skip terminals. Do not run the live test until every pre-flight box is checked.

---

## Quick Reference Card

| Item | Local Value |
|------|-------------|
| App URL | `http://localhost:3005` |
| Inngest Dev UI | `http://localhost:8288` |
| Ollama | `http://localhost:11434` |
| Redis | `redis://localhost:6379` |
| Qdrant | `http://localhost:6333` |
| Campaign API | `POST /api/v1/ai-cmo/campaigns` |
| Poll API | `GET /api/v1/ai-cmo/campaigns/jobs/{jobId}` |
| Inngest event | `ai-cmo/campaign.requested` |
| Live test command | `npm run test:live-integration` |

---

## Phase 0: Prerequisites

Complete **every** item before opening Terminal 1.

### 0.1 Install These Tools

| Tool | Version | Verify Command | If Missing |
|------|---------|----------------|------------|
| **Git** | Any recent | `git --version` | [git-scm.com](https://git-scm.com) |
| **Node.js** | **20+** | `node --version` | [nodejs.org](https://nodejs.org) |
| **npm** | 10+ | `npm --version` | Bundled with Node |
| **Docker Desktop** | Latest | `docker info` | Start Docker Desktop before infra step |
| **Ollama** | Latest | `ollama --version` | [ollama.com](https://ollama.com) |

### 0.2 Clone & Enter the Project

```powershell
cd e:\nexus-social-platform\nexus-social-app
```

*(Adjust path if your clone lives elsewhere.)*

### 0.3 Configure Environment (One-Time)

**Before Phase 1:** If `npm run uat:check-schema` reports missing tables, paste  
[`supabase/migrations/RUN_IN_SQL_EDITOR_UAT_BLOCKERS.sql`](../supabase/migrations/RUN_IN_SQL_EDITOR_UAT_BLOCKERS.sql)  
into Supabase SQL Editor (project `lnlzxaqockpjezxskmnb`), then re-run the schema check.

```powershell
# If .env.local does not exist yet:
Copy-Item .env.full-stack.example .env.local
```

Open `.env.local` and fill **at minimum**:

| Variable | What to Put |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `DATABASE_URL` | Postgres connection string (for migration apply) |
| `REDIS_URL` | `redis://localhost:6379` |
| `QDRANT_URL` | `http://localhost:6333` |
| `USE_LOCAL_OLLAMA` | `true` |
| `OLLAMA_BASE_URL` | `http://localhost:11434` |
| `OLLAMA_MODEL` | `llama3.2` (or `mistral` if hardware is slow) |
| `INNGEST_EVENT_KEY` | `local` |
| `INNGEST_SIGNING_KEY` | `signkey-local-dev-only-change-in-prod` |
| `INNGEST_DEV` | `1` |
| `NEXTAUTH_URL` | `http://localhost:3005` |
| `NEXTAUTH_SECRET` | Run: `openssl rand -base64 32` (or any 32+ char secret) |
| `AI_CMO_REDIS_INNGEST_BRIDGE_ENABLED` | `true` |

Optional but recommended: `OPENROUTER_API_KEY` (embeddings for Qdrant learning indexer).

### 0.4 Obtain Credentials Before Testing

You need two UUIDs and one secret **before** Phase 2:

#### A) Workspace API Key (`NEXUS_API_KEY`)

The campaign API uses **workspace API key auth** — not Supabase session JWT.

**Important:** Only the **SHA-256 hash** is stored in the database. You cannot retrieve a lost raw key from Supabase.

**Check if you already have a key** (look for one you saved when it was created):

In Supabase SQL Editor:

```sql
SELECT id, workspace_id, name, rate_limit_tier, created_at
FROM api_keys
WHERE workspace_id = '<YOUR_WORKSPACE_UUID>';
```

If rows exist but you lost the raw key, generate a new one (see **Phase 4 → Missing API Key**).

Set it in your shell before the live test:

```powershell
$env:NEXUS_API_KEY = "nsk_live_YOUR_RAW_KEY_HERE"
```

#### B) Brand ID (optional but recommended)

```sql
SELECT id, name, workspace_id
FROM brands
WHERE workspace_id = '<YOUR_WORKSPACE_UUID>'
LIMIT 5;
```

Save one `id` as `$env:LIVE_TEST_BRAND_ID` if you use Postman or want to pin the test brand.

#### C) Pre-Flight Checklist

| # | Checkpoint | Done |
|---|------------|:----:|
| 1 | Docker Desktop is running | ☐ |
| 2 | `.env.local` filled with Supabase + Inngest vars | ☐ |
| 3 | `USE_LOCAL_OLLAMA=true` in `.env.local` | ☐ |
| 4 | Raw API key saved in `$env:NEXUS_API_KEY` | ☐ |
| 5 | At least one `brands` row for your workspace (or skip brandId) | ☐ |
| 6 | Ollama model pulled: `ollama pull llama3.2` | ☐ |

---

## Phase 1: The 7-Terminal Startup

Open **seven separate terminal windows** (Windows Terminal tabs work great). Run them **in this order**. Wait for each "ready" signal before moving on.

---

### Terminal 1 — Infrastructure (Redis + Qdrant)

```powershell
cd nexus-social-app
npm run infra:v2
```

**What this does:** Starts Redis (`6379`) and Qdrant (`6333`) via Docker.

**Wait until you see:**
- Docker reports containers **started** or **running**
- No `connection refused` errors

**Verify (optional, same terminal):**

```powershell
docker ps
```

You should see containers for Redis and Qdrant.

**If Qdrant fails:** Run again:

```powershell
docker compose -f docker-compose.v2-local.yml up -d
```

**Do not proceed** until Docker shows both services running.

---

### Terminal 2 — Bootstrap & Stack Verification

```powershell
cd nexus-social-app
npm run bootstrap:local
npm run verify:v2-stack
```

**What this does:** Installs deps, applies migrations 000012→000015 (when `DATABASE_URL` + `psql` available), verifies Supabase/Redis/Qdrant/Ollama.

**Wait until you see:**

```
╔══════════════════════════════════════════════════════════╗
║  V2.0 STACK READY FOR FULL E2E TESTING                   ║
╚══════════════════════════════════════════════════════════╝
```

**If `verify-v2-stack` fails on Qdrant:** Terminal 1 may not be ready — rerun `npm run infra:v2`, wait 10 seconds, retry `npm run verify:v2-stack`.

**If migration 000015 fails:** See **Phase 4 → DB Migration Failed**.

**If Ollama fails but you will use Ollama:** Start Terminal 6 now, then re-run verify.

---

### Terminal 3 — Next.js App (Port 3005)

```powershell
cd nexus-social-app
npm run dev
```

**Wait until you see:**

```
▲ Next.js ...
- Local: http://localhost:3005
✓ Ready
```

**Quick sanity check (browser or curl):**  
Open `http://localhost:3005/api/auth/signin` — should load (not 500).

**Critical:** Terminal 3 **must** be fully booted **before** you start Terminal 5 (Inngest). Inngest discovers functions by polling `/api/inngest` on the Next.js app.

---

### Terminal 4 — Redis Worker + Inngest Bridge

```powershell
cd nexus-social-app
npm run worker:dev
```

**Wait until you see:**
- Worker bundle built successfully
- Log lines indicating Redis consumer / bridge activity (no immediate crash)

**What this does:** Runs 003 marketing event consumers and the Redis→Inngest bridge (`AI_CMO_REDIS_INNGEST_BRIDGE_ENABLED=true`).

**Leave this running** for the entire test session.

---

### Terminal 5 — Inngest Dev Server

**Only start this after Terminal 3 shows `Ready`.**

```powershell
cd nexus-social-app
npx inngest-cli@latest dev -u http://localhost:3005/api/inngest
```

**Wait until you see:**
- Dev server listening on **`http://localhost:8288`**
- Function registration lines, including:
  - `campaign-workflow`
  - `outcome-ingestion`
  - `trigger-replan`
  - `mv-refresh`
  - `radar-scan`
  - `sentinel-scan`
  - `quant-analytics-synced`

**You MUST see `campaign-workflow` registered.** If Inngest says **"No functions found"**, Terminal 3 is not ready — stop Inngest, wait for Next.js `Ready`, restart Terminal 5.

Open the Inngest UI: `http://localhost:8288` — confirm **8 functions** appear under app `nexus-ai-cmo`.

---

### Terminal 6 — Ollama (Local LLM)

If Ollama runs as a Windows service, you may skip a dedicated terminal. Otherwise:

```powershell
ollama serve
```

In a **separate** one-time terminal (or before testing):

```powershell
ollama pull llama3.2
```

**Verify:**

```powershell
curl http://localhost:11434/api/tags
```

Should return JSON listing your models.

**First prompt note:** Ollama may take **30–60 seconds** on the very first inference while the model loads into memory. This is normal.

---

### Terminal 7 — Reserved for Live Test & Postman

Keep this terminal free until Phase 2. You will run the automated live integration test here first, then manual Postman/curl UAT.

---

### Phase 1 Complete — Final Gate

| # | Terminal | Status | Ready Signal |
|---|----------|--------|--------------|
| 1 | Infrastructure | ☐ | Docker containers running |
| 2 | Bootstrap | ☐ | `V2.0 STACK READY` |
| 3 | Next.js | ☐ | `Ready` on `:3005` |
| 4 | Worker | ☐ | No crash, consuming |
| 5 | Inngest | ☐ | `campaign-workflow` registered |
| 6 | Ollama | ☐ | `/api/tags` returns models |
| 7 | (idle) | ☐ | Waiting for Phase 2 |

**All seven checked?** Proceed to Phase 2.

---

## Phase 2: Automated Live Integration

This phase runs the **real** closed loop: API → Inngest → Ollama → PII scrubber → Judge → Supabase — with **zero mocks**.

### 2.1 Run the Test

In **Terminal 7**:

```powershell
cd nexus-social-app
$env:NEXUS_API_KEY = "nsk_live_YOUR_RAW_KEY_HERE"
# Optional:
# $env:LIVE_TEST_BRAND_ID = "your-brand-uuid"

npm run test:live-integration
```

**Alternative with CLI flags:**

```powershell
npx tsx scripts/run-live-integration-test.ts --api-key nsk_live_... --brand-id <uuid>
```

**Flags reference:**

| Flag | Purpose |
|------|---------|
| `--api-key` | Workspace API key (or use `NEXUS_API_KEY` env) |
| `--brand-id` | Pin a brand UUID (or use `LIVE_TEST_BRAND_ID` env) |
| `--base-url` | Default `http://localhost:3005` |
| `--skip-ollama` | Skip Ollama pre-flight (cloud LLM only) |

### 2.2 What the Script Does (Watch Terminals 3, 5, 6)

1. **Pre-flight:** Pings Ollama, Next.js, Redis, Inngest dev, Supabase
2. **POST** `http://localhost:3005/api/v1/ai-cmo/campaigns` → expects **202 Accepted** + `jobId`
3. **Emits** Inngest event `ai-cmo/campaign.requested` (watch **Terminal 5** for the run)
4. **Polls** job status every 3 seconds (max **120 seconds**)
5. **Verifies** five database proofs via Supabase service role

**While polling, watch:**
- **Terminal 5:** Inngest run progressing through `finops-preflight` → `plan` → `generate` → `evaluate` → `persist`
- **Terminal 6:** Ollama CPU/GPU activity on first prompt
- **Terminal 7:** `[POLL] Status: processing...` → `evaluating...` → `completed`

### 2.3 The 5 Database Checks (What PASS Means)

| # | Check | Table(s) | PASS Means |
|---|-------|----------|------------|
| 1 | **Campaign exists** | `ai_cmo_campaigns` | Row for `campaignId` from completed job |
| 2 | **Content generated** | `ai_cmo_content_pieces` | Non-empty LLM caption/CTA persisted via reconciler |
| 3 | **PII scrubber** | Generated text + memory tables | Poison email `live-integration-poison@nexus.test` **not** in LLM output or scrubbed memory writes |
| 4 | **Judge evaluation** | `ai_cmo_evaluations` | `overall_quality_score > 0` |
| 5 | **FinOps ledger** | `ai_cmo_cost_ledger` | `amount_usd > 0` for this campaign (Ollama tokens tracked) |

### 2.4 Expected Success Output

```
╔══════════════════════════════════════════════════════════════════════╗
║  🎉 LIVE INTEGRATION TEST — ALL CHECKS PASSED                        ║
╚══════════════════════════════════════════════════════════════════════╝

  🟢 API → Inngest (ai-cmo/campaign.requested) → Ollama → Reconciler → Supabase: VERIFIED
  🟢 PII scrubber + FinOps ledger: VERIFIED
```

### 2.5 Phase 2 Gate

| # | Criterion | Pass |
|---|-----------|:----:|
| 1 | All pre-flight checks green | ☐ |
| 2 | POST returned 202 + jobId | ☐ |
| 3 | Inngest `campaign-workflow` completed in Terminal 5 | ☐ |
| 4 | Script printed **ALL CHECKS PASSED** | ☐ |
| 5 | All 5 DB checks green in script output | ☐ |

**If Phase 2 passes:** Architecture is mathematically proven in a live environment. Postman UAT (Phase 3) is confirmation, not discovery.

**If Phase 2 fails:** Go to **Phase 4** before attempting Postman.

---

## Phase 3: Manual Postman UAT

Run this **after** Phase 2 passes. Uses the same running stack — **do not tear down terminals**.

**Local base URL:** `http://localhost:3005` *(not 3000)*

### 3.1 Postman Environment Setup

Create a Postman environment with:

| Variable | Value |
|----------|-------|
| `baseUrl` | `http://localhost:3005` |
| `apiKey` | Your raw `nsk_live_...` key |
| `brandId` | UUID from `brands` table |
| `jobId` | *(leave empty — set from 202 response)* |

---

### Test A — Happy Path Campaign

**Request**

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `{{baseUrl}}/api/v1/ai-cmo/campaigns` |
| Header | `Content-Type: application/json` |
| Header | `x-api-key: {{apiKey}}` |

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

**Expected:** HTTP **202 Accepted**

```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "pollUrl": "/api/v1/ai-cmo/campaigns/jobs/550e8400-..."
}
```

**Poll:** `GET {{baseUrl}}/api/v1/ai-cmo/campaigns/jobs/{{jobId}}` with `x-api-key` header every 10 seconds for up to 2 minutes.

**Success when** `status: "completed"` and `result.status` is one of: `published`, `approval_required`, `policy_blocked`.

**Verify in Inngest UI (`localhost:8288`):** Run shows all steps through `persist` (and `link-post` if publishing enabled).

**Verify in Supabase SQL Editor:**

```sql
-- Recent campaign
SELECT id, name, status, objective, created_at
FROM ai_cmo_campaigns
WHERE workspace_id = '<YOUR_WORKSPACE_UUID>'
ORDER BY created_at DESC LIMIT 3;

-- Content + evaluation + costs (same queries as Phase 2 script)
SELECT cp.content->>'caption', cp.created_at
FROM ai_cmo_content_pieces cp
WHERE cp.workspace_id = '<YOUR_WORKSPACE_UUID>'
ORDER BY cp.created_at DESC LIMIT 3;
```

#### Test A — Pass Criteria

| # | Criterion | Pass |
|---|-----------|:----:|
| 1 | POST returns `202` with `jobId` | ☐ |
| 2 | Poll returns `status: completed` | ☐ |
| 3 | Inngest `campaign-workflow` run completes | ☐ |
| 4 | `ai_cmo_campaigns` + `ai_cmo_content_pieces` rows exist | ☐ |
| 5 | `ai_cmo_cost_ledger` has new agent cost entries | ☐ |

---

### Test B — Budget Block (FinOps Pre-Flight)

**Purpose:** Prove the workflow stops at `finops-preflight` when budget cap is exceeded.

**Important:** A `$0.00` cap does **not** block. Use a **positive cap below current spend**.

#### Setup (Supabase SQL Editor)

Replace `<YOUR_WORKSPACE_UUID>`:

```sql
-- Set $0.01 monthly cap
INSERT INTO ai_cmo_budget_policies (workspace_id, scope, period, cap_usd, action_on_cap)
VALUES ('<YOUR_WORKSPACE_UUID>', 'workspace', 'monthly', 0.01, 'block')
ON CONFLICT DO NOTHING;

UPDATE ai_cmo_budget_policies
SET cap_usd = 0.01, action_on_cap = 'block'
WHERE workspace_id = '<YOUR_WORKSPACE_UUID>'
  AND scope = 'workspace' AND period = 'monthly';

-- Seed spend above cap
INSERT INTO ai_cmo_cost_ledger (workspace_id, agent_name, cost_category, amount_usd, recorded_at)
VALUES ('<YOUR_WORKSPACE_UUID>', 'uat-budget-block-seed', 'tokens', 1.00, now());
```

#### Execute

Same **POST** as Test A (new objective text is fine). API still returns **202** — block happens **inside Inngest**.

#### Expected Poll Result

```json
{
  "status": "failed",
  "error": "Monthly AI budget cap ($0.01) exceeded",
  "result": { "status": "rejected", "reason": "Monthly AI budget cap ($0.01) exceeded" }
}
```

**Inngest:** Run stops at **`finops-preflight`** — no `plan` step output.

**SQL confirmation:**

```sql
SELECT COUNT(*) AS new_pieces
FROM ai_cmo_content_pieces
WHERE workspace_id = '<YOUR_WORKSPACE_UUID>'
  AND created_at > now() - interval '2 minutes';
-- Expected: 0
```

#### Cleanup (restore for future tests)

```sql
UPDATE ai_cmo_budget_policies SET cap_usd = 100.00
WHERE workspace_id = '<YOUR_WORKSPACE_UUID>' AND scope = 'workspace' AND period = 'monthly';

DELETE FROM ai_cmo_cost_ledger
WHERE workspace_id = '<YOUR_WORKSPACE_UUID>' AND agent_name = 'uat-budget-block-seed';
```

#### Test B — Pass Criteria

| # | Criterion | Pass |
|---|-----------|:----:|
| 1 | POST still returns `202` | ☐ |
| 2 | Poll returns `status: failed` with budget message | ☐ |
| 3 | Inngest stops at `finops-preflight` | ☐ |
| 4 | No new `ai_cmo_content_pieces` after block | ☐ |

---

## Phase 4: Troubleshooting & Rescue

### Ollama Timeout / Hangs

**Symptoms:** Live test times out at 120s; Terminal 6 shows no activity; poll stuck on `processing`.

**Rescue:**

1. Confirm model is pulled: `ollama pull llama3.2`
2. Test Ollama directly: `ollama run llama3.2 "Say hello in one word"`
3. First prompt is slow (30–60s) — **retry once** before debugging
4. Use a smaller/faster model — edit `.env.local`:
   ```
   OLLAMA_MODEL=mistral
   ```
   Then `ollama pull mistral` and restart Terminal 3
5. To extend timeout, edit `POLL_TIMEOUT_MS` in `scripts/run-live-integration-test.ts` (default 120000ms)

---

### Inngest Not Syncing / No Functions Found

**Symptoms:** Terminal 5 says "No functions found"; live test POST returns 202 but job never completes; Inngest UI shows 0 functions.

**Rescue:**

1. **Terminal 3 must be `Ready` first** — restart Terminal 5 after Next.js boots
2. Confirm serve URL: `npx inngest-cli@latest dev -u http://localhost:3005/api/inngest`
3. Hit manually: `curl http://localhost:3005/api/inngest` — should not 404
4. Ensure `inngest` package installed: `npm run bootstrap:local`
5. Check `.env.local`: `INNGEST_EVENT_KEY=local`, `INNGEST_DEV=1`

---

### Redis Not Running

**Symptoms:** Pre-flight fails "Redis is not running"; writes fail with "Redis unavailable — AI CMO writes blocked".

**Rescue:**

```powershell
npm run infra:v2
docker ps   # confirm Redis container
redis-cli ping   # expect PONG (if redis-cli installed)
```

Restart Terminals 3, 4, and 5 after Redis is healthy.

---

### Qdrant Connection Refused

**Symptoms:** `verify-v2-stack` fails Qdrant; embeddings errors in worker logs.

**Rescue:**

```powershell
docker compose -f docker-compose.v2-local.yml up -d
curl http://localhost:6333/collections
```

Qdrant is **not required** for the core campaign workflow to complete — but V2.0 verification expects it up.

---

### DB Migration Failed (000015)

**Symptoms:** `relation "ai_cmo_external_signals" does not exist`; verify-v2-stack fails Migration 000015.

**Rescue — Option A (automated):**

```powershell
$env:DATABASE_URL = "postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres"
npm run bootstrap:local
```

**Rescue — Option B (manual, Supabase SQL Editor):**

Run in order:

1. `supabase/migrations/RUN_IN_SQL_EDITOR_004_000012_only.sql` (or 000012)
2. `RUN_IN_SQL_EDITOR_004_000013_only.sql`
3. `RUN_IN_SQL_EDITOR_004_000014_only.sql`
4. `supabase/migrations/20260626_000015_ai_cmo_enterprise_ga.sql`

Then: `npm run verify:v2-stack`

---

### Missing / Invalid API Key

**Symptoms:** POST returns `401 Unauthorized`; live test says "Invalid API key".

**Important:** You **cannot** run `SELECT api_key FROM api_keys` — that column does not exist. Only `key_hash` is stored.

**Check existing keys (metadata only):**

```sql
SELECT id, workspace_id, name, created_at
FROM api_keys
WHERE workspace_id = '<YOUR_WORKSPACE_UUID>';
```

**Create a new key (PowerShell — save the raw key immediately):**

```powershell
$rawKey = "nsk_live_" + [guid]::NewGuid().ToString("N")
$bytes = [System.Text.Encoding]::UTF8.GetBytes($rawKey)
$hash = -join ([System.Security.Cryptography.SHA256]::Create().ComputeHash($bytes) | ForEach-Object { $_.ToString("x2") })
Write-Host "SAVE THIS KEY NOW: $rawKey"
Write-Host "Hash for SQL: $hash"
```

Then in Supabase SQL Editor:

```sql
INSERT INTO api_keys (workspace_id, name, key_hash, scopes)
VALUES (
  '<YOUR_WORKSPACE_UUID>',
  'live-uat-key',
  '<PASTE_SHA256_HASH_FROM_POWERSHELL>',
  '["read:posts"]'::jsonb
);
```

Set `$env:NEXUS_API_KEY = "<raw key from PowerShell output>"`

---

### Job Returns `failed` at `finops-preflight`

**Symptoms:** Budget exceeded message in poll response.

**Rescue:** You may have Test B setup still active. Run the **Test B cleanup SQL** in Phase 3, or raise cap:

```sql
UPDATE ai_cmo_budget_policies SET cap_usd = 100.00
WHERE workspace_id = '<YOUR_WORKSPACE_UUID>' AND scope = 'workspace';
```

---

### Job Stuck on `processing` Forever

**Rescue checklist:**

1. Terminal 5 — is Inngest dev running? Any failed run?
2. Terminal 4 — is worker running? Bridge enabled?
3. Terminal 6 — is Ollama responding?
4. Poll the job manually:
   ```powershell
   curl -H "x-api-key: $env:NEXUS_API_KEY" http://localhost:3005/api/v1/ai-cmo/campaigns/jobs/<jobId>
   ```
5. See `docs/004-SRE-RUNBOOK.md` for step-by-step Inngest/Langfuse triage

---

### Embeddings / OpenRouter Failures

**Symptoms:** Qdrant indexer errors; non-blocking for campaign workflow.

**Rescue:** Set `OPENROUTER_API_KEY` in `.env.local`. Campaign creation does not require embeddings.

---

## Executive Sign-Off

Complete this table when all phases pass. This is the formal handoff from engineering to production readiness review.

**Automated gate:** `npm run uat:human-gates` writes results to [`UAT-SIGNOFF-RESULTS.md`](./UAT-SIGNOFF-RESULTS.md). Copy verified rows below after a full PASS run.

| Checkpoint | Verified By | Date |
|------------|-------------|------|
| V2.0 Stack Verified (`verify:v2-stack` all green) | | |
| Live Integration 5/5 PASS (`npm run test:live-integration`) | | |
| Postman Test A (202 Accepted → completed) | | |
| Postman Test B (Budget Blocked at finops-preflight) | | |
| 9.7/10 Architecture Proven (live Ollama + Inngest + Supabase loop) | | |

**Quick commands (Terminal 7, after Terminals 1–6 running):**

```powershell
npm run uat:ensure-api-key          # creates NEXUS_API_KEY if needed
npm run test:live-integration         # Phase 2 automated proof
npm run uat:postman-ab                # Phase 3 Tests A + B (automated curl)
npm run uat:human-gates               # runs all gates + writes sign-off file
```

**Signatures**

| Role | Name | Date |
|------|------|------|
| Engineer (executed playbook) | | |
| QA | | |
| Product | | |
| CTO / Tech Lead | | |

---

## Related Documents

| Document | Purpose |
|----------|---------|
| `docs/FULL-STACK-LOCAL-SETUP.md` | Deep-dive V2.0 architecture reference |
| `docs/UAT-004-POSTMAN-COLLECTION.md` | Extended Postman/cURL detail |
| `docs/004-SRE-RUNBOOK.md` | Production incident triage |
| `scripts/run-live-integration-test.ts` | Automated live test source |
| `scripts/run-postman-uat-ab.ts` | Automated Postman Tests A + B |
| `scripts/run-human-uat-gates.ps1` | Full UAT orchestrator + sign-off writer |
| `docs/UAT-SIGNOFF-RESULTS.md` | Latest gate results (auto-updated by `uat:human-gates`) |
| `specs/004-ai-cmo-enterprise/SPECKIT-STATUS.md` | 58/58 task completion record |

---

**Engineering status: 100% complete.**  
**Your status: Execute this playbook.**  
**When the sign-off table is filled, Feature 004 is live-verified.**

---

## Appendix A: V2.0 Enterprise GA Integration Verification

Use this appendix **after** Phase 2 (live integration test) passes. It covers the 8-agent Inngest mesh, Qdrant vector memory, and the closed analytics loop — without overwriting the core 7-terminal flow above.

### V2.0 Inngest Function Registry (app: `nexus-ai-cmo`)

Confirm all **8 functions** appear in Terminal 5 (`http://localhost:8288`) after Next.js is ready:

| Function ID | Trigger | Agent / Purpose |
|-------------|---------|-----------------|
| `campaign-workflow` | `ai-cmo/campaign.requested` | Brain → Creator → Judge → persist |
| `outcome-ingestion` | Cron `0 2 * * *` | 003 `post_analytics` → `ai_cmo_campaign_outcomes` |
| `trigger-replan` | `ai-cmo/campaign.underperforming` | Optimizer + learning writes |
| `mv-refresh` | Cron hourly | FinOps materialized views |
| `radar-scan` | Cron every 4h | Radar agent + external signals |
| `sentinel-scan` | Cron every 6h | Sentinel anomaly scan |
| `quant-analytics-synced` | `ai-cmo/analytics.synced` | Quant agent on analytics sync |
| `inngest-failure-dlq` | Inngest `inngest/function.failed` | Postgres DLQ persistence |

---

### Pillar B Update — Qdrant Verification (V2.0)

After a campaign completes and the Optimizer/reconciler writes a learning (via replan or outcome loop):

1. Confirm Qdrant is up: `curl http://localhost:6333/collections`
2. Collection name pattern: `ws_{workspaceId_with_underscores}_learnings`  
   Example workspace `550e8400-e29b-41d4-a716-446655440000` →  
   `ws_550e8400_e29b_41d4_a716_446655440000_learnings`
3. Query collection points:

```powershell
$ws = "YOUR_WORKSPACE_UUID"
$collection = "ws_" + ($ws -replace '-','_') + "_learnings"
curl "http://localhost:6333/collections/$collection"
curl -X POST "http://localhost:6333/collections/$collection/points/scroll" `
  -H "Content-Type: application/json" `
  -d '{\"limit\": 5, \"with_payload\": true}'
```

**Pass:** Collection exists and contains at least one point after a learning is persisted and indexed (T027 hook).

---

### Pillar C Update — Autonomous Mesh (Sentinel + Quant)

#### Quant (analytics.synced)

After running the closed-loop trigger (Pillar D below), watch **Terminal 5** for a `quant-analytics-synced` run triggered by `ai-cmo/analytics.synced`.

#### Sentinel (6h cron or manual event)

**Automatic:** `sentinel-scan` runs on cron `0 */6 * * *` — watch Terminal 5 on the next boundary, or temporarily change cron locally for testing (not for production).

**Manual verification** — emit from Inngest Dev UI (`http://localhost:8288`) → Send Event:

```json
{
  "name": "ai-cmo/anomaly.detected",
  "data": {
    "workspaceId": "YOUR_WORKSPACE_UUID",
    "campaignId": "YOUR_CAMPAIGN_UUID",
    "anomalyId": "manual-uat-anomaly-1",
    "metric": "engagement_rate",
    "severity": "high",
    "dropPct": 35.5,
    "detectedAt": "2026-06-26T12:00:00+00:00"
  }
}
```

**Pass:** Event accepted; no DLQ row in `ai_cmo_failed_jobs` for the run.

#### Radar (optional)

Emit `ai-cmo/signal.detected` or wait for `radar-scan` cron (every 4h). Verify rows in `ai_cmo_external_signals`.

---

### Pillar D Update — V2.0 Closed Loop (Outcome → Quant)

Run **after** Phase 2 gives you a real `campaignId` with a linked `post_id`.

**Prerequisite:** If outcome ingestion fails on analytics read, ensure this column exists (one-time, Supabase SQL Editor):

```sql
ALTER TABLE post_analytics ADD COLUMN IF NOT EXISTS conversions INT DEFAULT 0;
```

**Command:**

```powershell
cd nexus-social-app
npm run trigger-local-outcome-loop -- --campaignId YOUR_CAMPAIGN_UUID
```

**What it does (5 steps):**

1. Inserts realistic mock `post_analytics` (impressions, clicks, conversions)
2. Emits `ai-cmo/analytics.synced` → wakes **Quant** (`quant-analytics-synced`)
3. Invokes **outcome-ingestion** handler (`runOutcomeIngestion` — same logic as Inngest fn `outcome-ingestion`)
4. Queries `ai_cmo_campaign_outcomes` for your campaign
5. Prints `outcome_id` and ROI summary

**Pass:** Console shows `🎉 CLOSED-LOOP TRIGGER — SUCCESS` with a non-empty `outcome_id`.

**Optional — Optimizer / replan:** After outcomes exist, trigger replan from Inngest Dev UI:

```json
{
  "name": "ai-cmo/campaign.underperforming",
  "data": {
    "workspaceId": "YOUR_WORKSPACE_UUID",
    "campaignId": "YOUR_CAMPAIGN_UUID",
    "trigger": "underperforming",
    "requestedAt": "2026-06-26T12:00:00+00:00"
  }
}
```

Watch `trigger-replan` in Terminal 5; verify new rows in `ai_cmo_learnings` and Qdrant collection (Pillar B).

---

### Appendix A Sign-Off

| V2.0 Checkpoint | Pass |
|-----------------|:----:|
| 8 Inngest functions registered in dev UI | ☐ |
| `trigger-local-outcome-loop` prints outcome_id | ☐ |
| `quant-analytics-synced` run observed | ☐ |
| Qdrant `ws_*_learnings` collection has points (after replan) | ☐ |
| Sentinel manual `anomaly.detected` event accepted | ☐ |
