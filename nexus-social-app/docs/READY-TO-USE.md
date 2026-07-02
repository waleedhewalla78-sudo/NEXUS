# Nexus Social — Ready to Use (Local)

**Updated:** 2026-06-27 · **Status:** UAT gates **PASS** (Postman A/B + live integration)

---

## Quick start (7 terminals)

| # | Command | Port |
|---|---------|------|
| 1 | `docker compose -f docker-compose.v2-local.yml up -d` | Redis 6379, Qdrant 6333 |
| 2 | `npm run verify:v2-stack` | — |
| 3 | `npm run dev` | **3005** |
| 4 | `npm run worker:dev` | worker + Redis→Inngest bridge |
| 5 | `npx inngest-cli@latest dev` | **8288** |
| 6 | Ollama running | **11434** |
| 7 | `npm run uat:human-gates` | verification |

**Path:** `e:\nexus-social-platform\nexus-social-app`

---

## Access URLs

| Surface | URL |
|---------|-----|
| App (login) | http://localhost:3005/login |
| AI CMO API | http://localhost:3005/api/v1/ai-cmo/campaigns |
| Inngest dev UI | http://localhost:8288 |
| Demo workspace | `11111111-1111-1111-1111-111111111111` |

---

## Environment

1. Copy `.env.full-stack.example` → `.env.local`
2. Fill Supabase URL + service role key (remote project)
3. Generate API key: `npx tsx scripts/ensure-uat-api-key.ts` → saves to `.uat-secrets.local`

**Schema bundles applied (paste in Supabase SQL Editor if fresh project):**

- `RUN_IN_SQL_EDITOR_UAT_BLOCKERS.sql`
- `RUN_IN_SQL_EDITOR_UAT_EVAL_COLUMNS.sql`
- `RUN_IN_SQL_EDITOR_UAT_AUDIT_LOGS.sql` ✅
- Optional: `RUN_IN_SQL_EDITOR_UAT_POSTS_BRAND_ID.sql`

Verify: `npm run uat:check-schema` → all OK

---

## Trigger a campaign (API)

```powershell
cd e:\nexus-social-platform\nexus-social-app
$env:NEXUS_API_KEY = (Get-Content .uat-secrets.local | Select-String 'NEXUS_API_KEY=').ToString().Split('=')[1]

curl -X POST http://localhost:3005/api/v1/ai-cmo/campaigns `
  -H "Content-Type: application/json" `
  -H "x-api-key: $env:NEXUS_API_KEY" `
  -d '{"objective":"Launch Q3 product webinar for enterprise buyers","locale":"en-US","persona":"operator"}'
```

Poll: `GET /api/v1/ai-cmo/campaigns/jobs/{jobId}` with same API key.

---

## Feature 005 APIs (Phase 7a)

| Endpoint | Purpose |
|----------|---------|
| `POST /api/v1/ai-cmo/campaigns/brief` | Campaign brief wizard backend |
| `POST /api/v1/ai-cmo/analytics/import` | Paid media CSV import + scoring |

---

## UAT verification (automated)

```powershell
npm run uat:check-schema          # schema OK
npm run uat:postman-ab            # Test B + Test A
npm run test:live-integration       # 5/5 DB checks
npm run uat:human-gates             # full orchestrator
```

**Latest results (2026-06-27):**

- Postman A/B: **ALL PASS**
- Live integration: **ALL CHECKS PASSED**
- Schema: **audit_logs OK**

---

## Human-deferred (not code blockers)

| Item | Doc |
|------|-----|
| Meta App Review + live FB/IG publish | `docs/OPERATOR-GATES.md` |
| 003 operator OAuth → publish UAT | `docs/HUMAN-UAT-PLAYBOOK.md` |
| Production env (Inngest Cloud, Sentry) | `.env.production.template` |

---

## Architecture fidelity

- 004 AI CMO: 58/58 Speckit tasks · 8-agent Inngest mesh
- Constitution v1.3.0 compliant
- UAT demo workspace uses **fast workflow** in dev (skips Ollama latency for gates)

---

## Support docs

| Doc | Purpose |
|-----|---------|
| `docs/HUMAN-UAT-PLAYBOOK.md` | Full 7-terminal playbook |
| `docs/UAT-SIGNOFF-RESULTS.md` | Sign-off table |
| `docs/OPERATOR-GATES.md` | Business gates |
| `specs/000-nexus-program/SPECKIT-STATUS.md` | Program status |
