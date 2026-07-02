# Nexus Social V2.0 — Full-Stack Local Setup Runbook

**Audience:** Engineers bootstrapping the 100/100 Enterprise GA stack locally after Sprints 15–17 (T021–T050).

**Prerequisites:** Node 20+, Docker Desktop, Supabase project (remote or `supabase start`), optional Ollama for closed-loop LLM testing.

---

## 1. Architecture Overview (7 Services)

| Service | Purpose | Local Port | How to Start |
|---------|---------|------------|--------------|
| **Next.js App** | UI + API routes (`/api/inngest`, `/api/auth/*`, `/api/v1/ai-cmo/*`) | **3005** | `npm run dev` |
| **003/004 Worker** | Redis consumers, RAG ingest, Redis→Inngest bridge | — | `npm run worker:dev` |
| **Redis** | 003 marketing event bus, rate limits | **6379** | `docker compose -f docker-compose.v2-local.yml up -d` |
| **Qdrant** | V2.0 vector memory + knowledge hub | **6333** | Same compose file |
| **Supabase** | Postgres + Auth + RLS | **5432** (local) or remote | Supabase dashboard / CLI |
| **Inngest Dev** | Workflow orchestration (campaign, radar, DLQ) | **8288** | `npx inngest-cli@latest dev` |
| **SAML IdP** (optional) | Enterprise auth testing | varies | [samltest.id](https://samltest.id) or corporate IdP |

Optional **Ollama** (port **11434**) when `USE_LOCAL_OLLAMA=true` for zero-cost LLM E2E.

---

## 2. One-Command Bootstrap

From `nexus-social-app/`:

```powershell
npm run bootstrap:local
```

This script (`scripts/Invoke-FullStackSetup.ps1`):

1. Creates `.env.local` from `.env.full-stack.example` if missing
2. Runs `npm install` + installs **openai**, **cheerio**, **next-auth**, **@playwright/test**
3. Starts **Redis + Qdrant** via `docker-compose.v2-local.yml`
4. Applies migrations **000012 → 000013 → 000014 → 000015** when `DATABASE_URL` + `psql` are available
5. Pings Qdrant at `http://localhost:6333/collections`

Then verify:

```powershell
npm run verify:v2-stack
```

Expected output when healthy:

```
✓ Redis: PONG
✓ Supabase: Connected
✓ Qdrant: Alive — 0 collection(s)
✓ Migration 000015: ai_cmo_external_signals + ai_cmo_failed_jobs present
╔══════════════════════════════════════════════════════════╗
║  V2.0 STACK READY FOR FULL E2E TESTING                   ║
╚══════════════════════════════════════════════════════════╝
```

---

## 3. Environment Configuration

Copy the V2.0 master template:

```powershell
cp .env.full-stack.example .env.local
```

### Required for V2.0

| Variable | Example | Used By |
|----------|---------|---------|
| `QDRANT_URL` | `http://localhost:6333` | Learning indexer, knowledge hub |
| `OPENROUTER_API_KEY` | `sk-or-v1-...` | Embeddings (`text-embedding-ada-002`) |
| `NEXTAUTH_URL` | `http://localhost:3005` | NextAuth session |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` | JWT signing |
| `SAML_IDP_METADATA_URL` | `https://samltest.id/saml/idp` | Enterprise SAML (T048) |
| `AI_CMO_REDIS_INNGEST_BRIDGE_ENABLED` | `true` | Worker bridge INT-01 |
| `USE_LOCAL_OLLAMA` | `true` | Local closed-loop LLM |

See `.env.full-stack.example` for the complete schema.

---

## 4. Database Migrations (000012 → 000015)

| Migration | File | Adds |
|-----------|------|------|
| 000012 | `20260624_000012_ai_cmo_foundation.sql` | Core `ai_cmo_*` tables |
| 000013 | `20260624_000013_ai_cmo_sprint14_draft.sql` | Evaluations, learnings, MVs |
| 000014 | `20260624_000014_agencies_hierarchy.sql` | `agencies`, `agency_members` |
| **000015** | `20260626_000015_ai_cmo_enterprise_ga.sql` | **`ai_cmo_external_signals`, `ai_cmo_failed_jobs`** |

### Apply via psql (automated in bootstrap)

```powershell
$env:DATABASE_URL = "postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres"
npm run bootstrap:local
```

### Apply manually (Supabase SQL Editor)

Paste and run, in order:

1. `supabase/migrations/RUN_IN_SQL_EDITOR_004_000012_only.sql` (or full 000012)
2. `RUN_IN_SQL_EDITOR_004_000013_only.sql`
3. `RUN_IN_SQL_EDITOR_004_000014_only.sql`
4. `supabase/migrations/20260626_000015_ai_cmo_enterprise_ga.sql`

---

## 5. Vector DB Setup (Qdrant)

After bootstrap, Qdrant runs at `http://localhost:6333/dashboard`.

Collections are created **on first write** by the learning indexer:

| Collection Pattern | Created By |
|--------------------|------------|
| `ws_{workspaceId}_learnings` | T027 post-reconciler hook after `ai_cmo_learnings` write |
| `ws_{workspaceId}_knowledge` | Knowledge Hub web scraper (T037–T038) |

Verify empty slate (fresh install):

```powershell
curl http://localhost:6333/collections
# → { "result": { "collections": [] } }
```

After triggering a campaign that persists a learning:

```powershell
curl http://localhost:6333/collections/ws_YOUR_WORKSPACE_ID_learnings
```

---

## 6. Authentication Flow (NextAuth + SAML)

NextAuth routes (requires `npm run dev`):

| Endpoint | Purpose |
|----------|---------|
| `GET /api/auth/signin` | Sign-in page |
| `GET /api/auth/signin/saml` | Enterprise SAML provider |
| `GET /api/auth/callback/saml` | SAML callback (see `enterprise-saml.ts`) |

Env vars read by `readSamlEnvConfig()`:

- `SAML_IDP_METADATA_URL`
- `SAML_IDP_ENTITY_ID`
- `SAML_SP_ENTITY_ID` (defaults to `NEXT_PUBLIC_APP_URL`)
- `SAML_CLIENT_ID`, `SAML_CLIENT_SECRET`, `SAML_CERT`

Local test with samltest.id:

1. Set `SAML_IDP_METADATA_URL=https://samltest.id/saml/idp` in `.env.local`
2. Start app: `npm run dev`
3. Visit `http://localhost:3005/api/auth/signin`
4. Select **Enterprise SAML** — completes SCIM-lite user provisioning via `provisionUserFromSamlAssertion()`

---

## 7. The 8-Agent Mesh Verification

All L6 agents use **read-only SQL + ProviderRouter** — no direct DB writes.

| Agent | Trigger | Verify |
|-------|---------|--------|
| **Radar** | Inngest cron `radar-scan` (every 4h) or manual run | Rows in `ai_cmo_external_signals` |
| **Brain** | `POST /api/v1/ai-cmo/campaigns` | Campaign workflow completes |
| **Sentinel** | Manual Inngest event or agent run | Emits `ai-cmo/anomaly.detected` |
| **Quant** | `ai-cmo/analytics.synced` event | Returns CTR/time-series insights |
| **Finance** | Agent run with workspaceId | ROI from `ai_cmo_cost_ledger` + outcomes |
| **Compliance** | Policy engine V2 on content | MENA/EU rules when `dataRegion` set |
| **Creator** | Campaign workflow step | Content piece persisted via reconciler |
| **Optimizer** | `ai-cmo/replan.requested` | Learning write + optional Qdrant index |

### Trigger Sentinel manually (time-series std-dev)

With Inngest dev running, send from Inngest dashboard or curl the dev server:

```json
{
  "name": "ai-cmo/analytics.synced",
  "data": {
    "workspaceId": "YOUR-WORKSPACE-UUID",
    "postId": "post-1",
    "syncedAt": "2026-06-26T00:00:00Z",
    "metrics": { "impressions": 1000, "engagement_rate": 0.02 }
  }
}
```

Or run unit math directly:

```powershell
npm test -- sentinel-agent
```

---

## 8. Holy Grail V2.0 Startup Sequence

### Terminal 1 — Infrastructure

```powershell
cd nexus-social-app
docker compose -f docker-compose.v2-local.yml up -d
# Optional: ollama serve
```

### Terminal 2 — Setup & Migrate

```powershell
cd nexus-social-app
npm run bootstrap:local
npm run verify:v2-stack
```

### Terminal 3 — Next.js App

```powershell
cd nexus-social-app
npm run dev
# → http://localhost:3005
```

### Terminal 4 — Worker (003 + 004 bridge)

```powershell
cd nexus-social-app
npm run worker:dev
```

### Terminal 5 — Inngest Dev

```powershell
cd nexus-social-app
npx inngest-cli@latest dev -u http://localhost:3005/api/inngest
# → http://localhost:8288
```

### Terminal 6 — Verify Stack

```powershell
cd nexus-social-app
npm run verify:v2-stack
npm test -- radar-agent qdrant-client sentinel-agent finance-agent
```

---

## 9. Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Cannot find module 'openai'` | `npm run bootstrap:local` |
| `relation "ai_cmo_external_signals" does not exist` | Apply migration 000015 |
| Qdrant connection refused | `docker compose -f docker-compose.v2-local.yml up -d` |
| Embeddings fail | Set `OPENROUTER_API_KEY` in `.env.local` |
| NextAuth error | Set `NEXTAUTH_SECRET` + `NEXTAUTH_URL=http://localhost:3005` |
| Inngest 501 | `npm install inngest` + sync dev server |
| Bridge not forwarding | Check `AI_CMO_REDIS_INNGEST_BRIDGE_ENABLED=true` on worker |

---

## 10. Related Docs

- Enterprise GA completion: `docs/004-PROJECT-CLOSED-V1.md`
- SRE runbook: `docs/004-SRE-RUNBOOK.md`
- Pentest scope: `docs/004-PENTEST-SCOPE.md`
- UAT Postman: `docs/UAT-004-POSTMAN-COLLECTION.md`
