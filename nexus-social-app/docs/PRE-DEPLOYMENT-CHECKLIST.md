# Pre-Deployment Checklist

**Updated:** 2026-06-28  
**Verdict:** Code-ready for **staging**; production blocked on Section B human gates.

---

## Section A: Code-Ready (Automated)

Run locally before any deploy:

```powershell
cd e:\nexus-social-platform\nexus-social-app
npm run infra:v2
npm run typecheck
npm run test:unit          # target 210/210
npm run test:integration   # 18/18
npm run uat:check-schema   # audit_logs + eval columns
npm run verify:v2-stack      # Redis, Supabase, Qdrant, Ollama /api/tags
npm run uat:postman-ab       # Test B budget + Test A published
npm run test:live-integration  # 5/5 closed loop
npm run load-test            # k6 health-only smoke (:3005 default)
```

| Gate | Expected | Last verified |
|------|----------|---------------|
| Unit tests (Vitest) | **210/210 PASS** | 2026-06-28 (DEF-001 fixed) |
| Integration tests | **18/18 PASS** | 2026-06-28 |
| Typecheck | **PASS** | 2026-06-28 |
| Schema UAT | **9/9 OK** | 2026-06-28 |
| Postman A/B | **PASS** | 2026-06-27 |
| Live integration | **5/5 PASS** | 2026-06-27 |
| k6 smoke (health only) | **<5% failure** | Re-run after Loop 2 |

**Architecture note:** No changes to 9-layer agent mesh, reconciler, or webhook auth in this remediation — test/load/verify scripts only.

---

## Section B: Human-Business Gates (BLOCKING PRODUCTION)

These cannot be closed by code changes alone.

- [ ] **B1 — Meta App Review**  
  Submit for IG/FB publish permissions. Map long-lived system user token to `workspace_social_connections`.  
  Reference: [`OPERATOR-GATES.md`](OPERATOR-GATES.md)

- [ ] **B2 — Live OAuth UAT**  
  Add sandbox OAuth keys to `.env.local`, then:  
  `npm run uat:t053` (or `npm run uat:t053:sandbox` for mock Graph API)

- [ ] **B3 — Executive sign-off**  
  Product + CTO names in [`UAT-SIGNOFF-RESULTS.md`](UAT-SIGNOFF-RESULTS.md)

- [ ] **B4 — Production secrets**  
  Copy [`.env.production.template`](../.env.production.template) → prod env. Set Inngest Cloud signing key, Sentry DSN, prod Supabase URL/keys.

- [ ] **B5 — Staging k6 full run**  
  Against staging URL:  
  `BASE_URL=https://staging.example.com npm run load-test:full`

- [ ] **B6 — Playwright E2E on staging**  
  `NEXT_PUBLIC_APP_URL=<staging> npm run test:ui`

---

## Optional / P2 (not blocking staging)

| Item | Notes |
|------|-------|
| TikTok/Snapchat live publishers | Enum + graceful skip only (DEF-006) |
| XLSX paid media import | CSV only in v1.0 (DEF-007) |
| Cypress nightly | DEF-010 — wire pre-release |
| Pentest (FR-P04) | S17 scope |
| SAML IdP production | NextAuth route stub; configure IdP |

---

## Section C: Production Cutover Execution (Post-Business Gate)

Run **only after** Section B gates B1–B4 are cleared (Meta approved, OAuth UAT passed, exec sign-off, prod secrets ready).

### C1 — Fill production environment

Copy [`.env.production.template`](../.env.production.template) → `.env.production` on the production host (never commit filled values). Required keys:

| Key | Purpose |
|-----|---------|
| `DATABASE_URL` | Supabase production Postgres connection string |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (server-only) |
| `REDIS_URL` | Managed Redis (Upstash / Redis Cloud) |
| `QDRANT_URL` / `QDRANT_API_KEY` | Managed Qdrant cluster |
| `INNGEST_EVENT_KEY` | Inngest Cloud event key |
| `INNGEST_SIGNING_KEY` | Inngest Cloud signing key |
| `INNGEST_DEV` | Must be `0` (not local dev CLI) |
| `NEXT_PUBLIC_APP_URL` | Public production URL (e.g. `https://app.example.com`) |
| `NEXTAUTH_URL` / `NEXTAUTH_SECRET` | Auth session |
| `SENTRY_DSN` / `SENTRY_ENVIRONMENT` | Error tracking |
| `OPENROUTER_API_KEY` / `DIFY_API_KEY` | LLM providers |
| `INTERNAL_TOOL_SECRET` / `APPROVAL_HMAC_SECRET` / `TOKEN_ENCRYPTION_KEY` | Security |

### C2 — Deploy via CI/CD (recommended)

1. Merge to `main` — GitHub Actions [`.github/workflows/deploy-production.yml`](../.github/workflows/deploy-production.yml) runs typecheck, unit/integration tests, builds standalone Next.js, and pushes `ghcr.io/<org>/nexus-social-app:latest`.
2. Uncomment the deploy block in that workflow (SSH, Vercel, or ECS) and add secrets.
3. Or pull manually on the host:

```powershell
cd e:\nexus-social-platform\nexus-social-app
$env:IMAGE = "ghcr.io/YOUR_ORG/nexus-social-app:latest"
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

### C3 — Post-deploy verification (ordered)

```powershell
cd e:\nexus-social-platform\nexus-social-app

# 1. Inngest Cloud keys + API reachability
npm run verify:inngest-cloud

# 2. App health (container or load balancer)
curl http://localhost:3000/api/health
# Expect: {"status":"ok",...}

# 3. Full stack smoke (managed Redis/Supabase must be reachable from host)
npm run verify:v2-stack

# 4. Sync Inngest functions in dashboard → Apps → nexus-ai-cmo → Sync
# 5. Staging-scale load (Section B5) then Playwright E2E (Section B6)
```

### C4 — Rollback

```powershell
docker compose -f docker-compose.prod.yml down
docker pull ghcr.io/YOUR_ORG/nexus-social-app:<previous-sha>
$env:IMAGE = "ghcr.io/YOUR_ORG/nexus-social-app:<previous-sha>"
docker compose -f docker-compose.prod.yml up -d
```

---

## Quick reference

| Doc | Purpose |
|-----|---------|
| [`OPERATOR-GATES.md`](OPERATOR-GATES.md) | Meta, OAuth, prod env |
| [`HUMAN-UAT-PLAYBOOK.md`](HUMAN-UAT-PLAYBOOK.md) | 7-terminal stack |
| [`READY-TO-USE.md`](READY-TO-USE.md) | Local product guide |
| [`UAT-SIGNOFF-RESULTS.md`](UAT-SIGNOFF-RESULTS.md) | Gate results + exec sign-off |
