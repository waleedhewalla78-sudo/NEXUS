# Nexus Program — Full Test Plan (Day 0 → Now)

**Updated:** 2026-07-04  
**App:** `nexus-social-app` · **Prod:** `https://nexussocial.tech`

Run from `nexus-social-app/`:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/run-full-program-verify.ps1
# or:
npm run verify:program
```

---

## Tier A — Local automated (no secrets beyond `.env.local`)

| # | Command | Expected | Covers |
|---|---------|----------|--------|
| A1 | `npm run typecheck` | exit 0 | TS whole app |
| A2 | `npm run test:unit` | ≥250 passed | Libraries, agents, enterprise leads, flags |
| A3 | `npm run test:integration` | 18/18 | Cross-module |
| A4 | `npm run schema:verify` | 18/18 tables | 003 SoR |
| A5 | `npm run schema:verify:004` | 11/11 | AI CMO |
| A6 | `npm run uat:check-schema` | all OK incl. `enterprise_leads`, `abm_playbook_runs` | Sprint 2 LMM |

---

## Tier B — Live stack (app + Redis + Inngest + API key)

| # | Command | Expected | Covers |
|---|---------|----------|--------|
| B1 | `npm run verify:abm-seed` | activate 202, control plane 200 | ABM |
| B2 | `npm run uat:postman-ab` | Test A + B PASS | Campaign budget |
| B3 | `npm run test:live-integration` | 5/5 | Mesh closed loop |
| B4 | `npm run test:e2e` | 23+ pass (auth may skip) | Playwright |
| B5 | `npm run load-test` | k6 fail rate &lt;5% | Health smoke |

---

## Tier C — GTM / enterprise (prod or staging URL)

| # | Check | Expected |
|---|-------|----------|
| C1 | `GET /enterprise` | 200, hero + form |
| C2 | `POST /api/v1/enterprise/leads/inbound` | 201 + row in `enterprise_leads` |
| C3 | `GET /api/v1/enterprise/leads` (session) | 200 array |
| C4 | `POST /api/v1/enterprise/leads/meta-ads` + HMAC | 200 |
| C5 | Navbar Sign in → GitHub OAuth | NextAuth callback works |
| C6 | `/settings/integrations` → Connect LinkedIn | Token in `workspace_social_connections` |
| C7 | Feature flags | SaaS chrome hidden when `ENABLE_SaaS_UI=false` |

### C2 curl (PowerShell)

```powershell
$body = @{
  firstName = 'Waleed'; lastName = 'Hewalla'
  email = 'test@example.com'; company = 'Nexus Corp'
  message = 'Demo request'; source = 'website_form'
} | ConvertTo-Json
Invoke-RestMethod -Uri 'https://nexussocial.tech/api/v1/enterprise/leads/inbound' `
  -Method POST -ContentType 'application/json' -Body $body
```

### C6 LinkedIn

Redirect URI must be exactly:  
`https://nexussocial.tech/api/oauth/linkedin/callback`

---

## Tier C2 — Intelligence (Sprint 7)

| # | Check | Expected |
|---|-------|----------|
| I1 | Migration `20260715_intelligence_feed.sql` applied | tables in schema cache |
| I2 | `POST /api/v1/intelligence/ingest` (session + CSV) | 201 |
| I3 | `POST /api/v1/intelligence/brief` | brief created |
| I4 | `GET /api/v1/intelligence/feed` | briefs + ingests |
| I5 | UI `/intelligence` | upload, badges, copy, empty state |

```powershell
npm run qa:enterprise:report   # flags missing intelligence tables
```

---

## Tier D — Pilot ROI simulation (Sprint 5)

```powershell
$env:PILOT_WORKSPACE_ID = '<workspace-uuid>'
$env:NEXT_PUBLIC_SUPABASE_URL = '<prod-url>'
$env:SUPABASE_SERVICE_ROLE_KEY = '<service-role>'
# optional: $env:OPENROUTER_API_KEY = '...'
npm run generate:pilot-report
```

Expected: executive summary printed; rows in `ai_cmo_campaigns`, `ai_cmo_content_pieces`, `crm_activity_mirror`, `attribution_reports`.

---

## Tier E — Production deploy gates (human)

| # | Gate | Runbook |
|---|------|---------|
| E1 | Hermes `git pull` + rebuild | `docs/OPS-SPRINT-3-HERMES.md` |
| E2 | Meta App Review (publish) | `docs/OPS-META-APP-REVIEW.md` |
| E3 | OAuth UAT T053–T056 | `docs/OPS-OAUTH-UAT-RUNBOOK.md` |
| E4 | Exec sign-off | `docs/UAT-SIGNOFF-RESULTS.md` |
| E5 | Client #1 payment | Sprint 6 gate |

---

## Tier F — Not automated / blocked

| Item | Why |
|------|-----|
| Sprint 4 `provision-pilot-client.ts` | Never built (sales gate); manual workspace + ABM seed |
| Sprint 6 Pit Crew `/admin` | Payment gate — do not build until Client #1 paid |
| Agency `000014` | A-GATE-003 |
| Live Meta publish | B1 App Review |
| Full k6 AI load on prod | Optional; needs auth tokens |
