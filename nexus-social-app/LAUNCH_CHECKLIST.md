# Nexus Social — Launch Checklist

Use this checklist before staging/production go-live. Feature spec: `specs/003-real-integrations-production/`.

**Last verified:** 2026-07-03 — typecheck PASS · 231 unit tests · schema:verify · uat:check-schema 13/13 · verify:abm-seed PASS  
**Production ops:** [`.env.production.template`](./.env.production.template) · [`docs/OPS-PROD-CUTOVER.md`](./docs/OPS-PROD-CUTOVER.md) · [`docs/GATES-REMAINING.md`](./docs/GATES-REMAINING.md) · `npm run verify:production:*`

---

## 1. Database migrations

Apply **in filename order** under `supabase/migrations/` (000001 → 000010):

| # | Migration | Required for |
|---|-----------|--------------|
| 000001 | baseline | core app |
| 000002 | ai_billing | AI agent, automations |
| 000003 | reputation | listening, mentions |
| 000004 | social_connections | OAuth + publish |
| 000005 | post_analytics | real analytics |
| 000006 | notify_pgrst | PostgREST reload |
| 000007 | analytics_rpc | dashboard RPC |
| 000008 | missing_tables | invites, notifications, SSO |
| 000009 | migration_status | enterprise import worker |
| 000010 | meta_app_review | Meta publish gate |

```powershell
cd D:\nexus-social-platform\nexus-social-app
npm run db:link          # one-time
npm run db:migrate       # applies through 000010 on linked project
npm run schema:verify    # must pass — 18/18 tables
```

**If SQL Editor was used without NOTIFY:**

```sql
NOTIFY pgrst, 'reload schema';
```

Or run `supabase/migrations/PATCH_MIGRATION_STATUS_NOTIFY.sql` for idempotent `migration_status` + reload.

### Feature 004 — AI CMO (Sprint 12–13)

| # | Migration | Status | Required for |
|---|-----------|--------|--------------|
| 000011 | ai_cmo_hierarchy | **Applied** | tenants, brands, `ai_cmo_campaigns` |
| 000012 | ai_cmo_foundation | **Applied** | content pieces, learnings, FinOps, attribution, evaluations |

If applying to a fresh project, run `supabase/migrations/RUN_IN_SQL_EDITOR_004_sprint12.sql` (combined) or numbered migrations in order, then `NOTIFY pgrst, 'reload schema';`.

```powershell
npm run schema:verify:004   # expect 11/11 after 000012
```

**Sprint 13 API (after API key configured):**

- `POST /api/v1/ai-cmo/campaigns` — run campaign workflow (Brain → Creator → policy → quality → reconciler)
- `POST /api/v1/ai-cmo/confidence` — calibrated confidence + persona explainability

**Dify:** Publish Strategic Brain + Creator apps; set `DIFY_API_KEY` or workspace app key in Settings → AI Agent.

### Feature 004 — Sprint 14 (optional until leadership sign-off)

| # | Migration | SQL Editor bundle | Required for |
|---|-----------|-------------------|--------------|
| 000013 | ai_cmo_sprint14_draft | `RUN_IN_SQL_EDITOR_004_000013_only.sql` | decision ledger, experiments, budget policies, eval extensions |

After apply: `NOTIFY pgrst, 'reload schema';` (included in bundle). Enables FinOps budget policies, optimizer decision ledger, async campaign job persistence at full depth.

Spec: `specs/004-ai-cmo-master-prd-v3/`. Notion: [Feature 004](https://www.notion.so/3886f21f521a8111aaacf9f2414b668e).

### Feature 005 — Enterprise ABM (Sprint 18–19)

| # | Migration | Required for |
|---|-----------|--------------|
| 20260630 | enterprise_abm_tables | ABM accounts, attribution, `crm_activity_mirror` |
| 20260701 | abm_playbook_runs | Activation audit trail |

SQL Editor bundle: `supabase/migrations/RUN_IN_SQL_EDITOR_UAT_ABM.sql` (includes NOTIFY).

```powershell
npm run verify:abm-seed      # seed + activate smoke
npm run uat:check-schema     # 13/13 incl. abm_playbook_runs
```

Spec: `specs/005-enterprise-revenue-loop/`. Ops: `docs/OPS-HUBSPOT-LIVE-CONFIG.md`, `docs/OPS-SALESFORCE-WEBHOOK.md`.

---

## 2. Environment variables

Copy `.env.example` → `.env.local` (dev) or platform secrets (prod).

### Required (all environments)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client auth |
| `SUPABASE_SERVICE_ROLE_KEY` | Server/worker admin |
| `INTERNAL_TOOL_SECRET` | Tool proxy auth (≥32 chars) |
| `REDIS_URL` | Queue, rate limits, worker heartbeat |
| `DATABASE_URL` | Direct Postgres for migrations (ends `/postgres`) |
| `INNGEST_SIGNING_KEY` / `INNGEST_EVENT_KEY` | Orchestration (prod: Inngest Cloud) |

### Required in production (`NODE_ENV=production`)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_APP_URL` | OAuth redirects, invites |
| `DIFY_API_KEY` | AI features |
| `CHATWOOT_WEBHOOK_SECRET` | Inbox webhooks |
| `APPROVAL_HMAC_SECRET` | OAuth state signing (≥32 chars) |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Billing |
| `TOKEN_ENCRYPTION_KEY` | OAuth token vault (when `PUBLISHING_ENABLED=true`) |

Generate token key: `openssl rand -hex 32`

**Production template:** copy [`.env.production.template`](./.env.production.template) to secrets manager — never commit filled values.

### Publishing OAuth (Phase 1 UAT)

| Variable | Network |
|----------|---------|
| `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` | LinkedIn |
| `X_CLIENT_ID` / `X_CLIENT_SECRET` | X |
| `META_APP_ID` / `META_APP_SECRET` | Meta (connect only until App Review) |

Redirect URIs must match `{NEXT_PUBLIC_APP_URL}/api/oauth/{network}/callback`.

### Must stay off in production

| Variable | Value |
|----------|-------|
| `DEMO_ANALYTICS_ENABLED` | `false` |
| `NODE_ENV` | `production` |

---

## 3. Redis + worker

```powershell
docker compose -f docker-compose.redis.yml up -d
npm run worker:dev    # dev
# production: run compiled worker alongside app (see DEPLOYMENT.md)
```

Worker loops: publish (60s), analytics sync (6h), token refresh (1h), reputation (1h), RAG ingest (6h), migration poller.

Health check: `GET /api/health` → `details.worker` = `up` when heartbeat key exists in Redis.

---

## 4. Dify AI publish gate

```powershell
npm run ai:verify
```

| Exit | Meaning |
|------|---------|
| 0 | App published — enable AI for demos |
| 1 | Missing/invalid credentials |
| 2 | App not published in Dify Studio |

Publish in Dify Cloud → Studio → **Publish** → confirm API key matches published app.

---

## 5. Meta App Review (business blocker — T057)

Engineering complete; **production Facebook/Instagram publish blocked** until:

```sql
UPDATE workspaces
SET meta_app_review_status = 'approved'
WHERE id = '<workspace-uuid>';
```

Until then, publish attempts fail with user-visible "Meta App Review pending" messaging (SC-007).

---

## 6. OAuth app registration

Register dev/staging/prod apps at:

- [LinkedIn Developer](https://www.linkedin.com/developers/)
- [X Developer Portal](https://developer.x.com/)
- [Meta for Developers](https://developers.facebook.com/)

Document redirect URIs in `.env.example` and platform console.

---

## 7. CI gates

| Workflow | Trigger | Gate |
|----------|---------|------|
| `.github/workflows/nexus-social-app-ci.yml` | PR | lint, test, typecheck, `verify:staging` |
| `.github/workflows/supabase-migrations.yml` | PR (migration paths) | migration dry-run |
| `.github/workflows/ci.yml` | PR | Vitest + Playwright smoke |

Local preflight:

```powershell
npm run preflight          # typecheck, test, build, schema, playwright smoke
npm run verify:staging     # + ai:verify
```

---

## 8. Smoke test steps (manual UAT)

### T053 — OAuth → schedule → publish

1. `npm run dev` + `npm run worker:dev`
2. Settings → Connect LinkedIn or X via OAuth
3. Schedule post 2 minutes ahead
4. Confirm status `published` + `external_post_id` (or explicit `failed` with reason)

### T055 — Analytics truth

1. `DEMO_ANALYTICS_ENABLED=false`
2. After publish, wait for analytics sync or trigger worker
3. `/analytics` shows ingested metrics or empty state — never demo fallback

### T056 — Full-stack walkthrough

```powershell
docker compose -f docker-compose.full-stack.yml up -d
npm run walkthrough
```

### Automated smoke (no OAuth)

```powershell
npm run dev   # terminal 1
npx playwright test e2e/smoke.spec.ts   # health + login redirect
```

---

## 9. Seed / demo data

```powershell
npm run seed:walkthrough
```

Demo account: `demo@nexussocial.io` / `DemoWalk2026!` (see `CLIENT_DEMO.md`).

---

## 10. Launch blockers (honest)

| Blocker | Owner | Status |
|---------|-------|--------|
| Meta App Review (T057) | Business | Gate implemented; awaiting approval |
| Live OAuth UAT (T053) | Operator | Needs sandbox credentials |
| Dify app publish | Operator | `ai:verify` exit 2 until published |
| Playwright publish E2E (T024) | Engineering | Deferred — use manual UAT |
| Phase 4 CI on main (T054) | CI | Workflows ready; merge to main to activate |

---

## Quick command reference

```powershell
npm run typecheck
npm test
npm run schema:verify
npm run build
npm run ai:verify
npm run db:migrate
npm run seed:walkthrough
npm run verify:staging
npm run preflight
```
