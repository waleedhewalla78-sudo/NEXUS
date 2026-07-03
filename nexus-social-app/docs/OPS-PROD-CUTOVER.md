⚠️ Hostinger VPS Constraints
RAM Limit: 8GB Total. Nexus container is hard-limited to 3GB via Docker deploy.resources.
No Local Databases: Redis (Upstash) and Postgres (Supabase) are managed cloud services. Do not spin up Redis/Postgres containers on this server.
Reverse Proxy: Caddy handles SSL termination and routing to the Nexus container. There is no Nginx.
Orchestrator: Deployment is triggered via Hermes AI (SSH), not GitHub Actions CI/CD.

---

# Production Cutover Runbook

**Product:** Nexus Social Platform  
**Audience:** DevOps / Platform Engineering  
**Prerequisite:** Staging gates B5–B6 passed (see [`OPS-STAGING-VERIFICATION.md`](./OPS-STAGING-VERIFICATION.md))

---

## 1. Create production Supabase project

1. Create a **separate** Supabase project for production (do not reuse UAT).
2. Record `${PROD_SUPABASE_URL}`, anon key, service role key.
3. Copy **Database → Connection string → URI** → `${PROD_DATABASE_URL}` (must end with `/postgres`).

---

## 2. Apply migrations (in order)

Apply via SQL Editor or `npm run db:migrate:local` with `${PROD_DATABASE_URL}` set.

| Order | Migration / bundle | Track |
|-------|-------------------|-------|
| 1 | `000001` → `000010` | 003 baseline |
| 2 | `000011` → `000012` | 004 hierarchy + foundation |
| 3 | `20260630_enterprise_abm_tables.sql` or `RUN_IN_SQL_EDITOR_UAT_ABM.sql` | 005 ABM |
| 4 | `20260701_abm_playbook_runs.sql` | 005 activation audit |

**Optional (leadership gate):**

| Migration | Gate |
|-----------|------|
| `000013`–`000015` | Sprint 14 GA — apply when approved |
| `000014` | **A-GATE-003 only** — see [`GATES-REMAINING.md`](./GATES-REMAINING.md) |

After each SQL Editor apply:

```sql
NOTIFY pgrst, 'reload schema';
```

Verify:

```powershell
npm run schema:verify
npm run schema:verify:004
npm run uat:check-schema
```

---

## 3. Configure production environment

1. Copy [`.env.production.template`](../.env.production.template) into your secrets manager.
2. Fill **all** `${PROD_*}` placeholders — see inline comments.
3. Confirm `NODE_ENV=production`, `DEMO_ANALYTICS_ENABLED=false`.

---

## 4. Deploy application + worker

Deploy **both** processes with identical env:

| Process | Entry |
|---------|-------|
| Next.js app | `npm run build` → `npm run start:prod` or container |
| Background worker | `src/bin/worker.ts` (bundled in Docker/PM2) |

**Health check:**

```http
GET ${PROD_APP_URL}/api/health
```

Expect: `db: up`, Redis/worker heartbeat OK.

---

## 5. Inngest Cloud

1. Register app URL: `${PROD_APP_URL}/api/inngest`
2. Set `${PROD_INNGEST_SIGNING_KEY}` and `${PROD_INNGEST_EVENT_KEY}` in prod env.
3. **Ensure `INNGEST_SIGNING_KEY` is the Cloud key, NOT the local Dev CLI key.**
4. Confirm 8 functions visible in Inngest dashboard.
5. Run: `npm run verify:inngest-cloud` (from operator machine with prod env loaded).

---

## 6. OAuth redirect URIs

Update developer consoles with `${PROD_APP_URL}`:

| Platform | Redirect URI |
|----------|--------------|
| Meta | `${PROD_APP_URL}/api/oauth/meta/callback` |
| LinkedIn | `${PROD_APP_URL}/api/oauth/linkedin/callback` |
| X | `${PROD_APP_URL}/api/oauth/x/callback` |

---

## 7. CRM webhooks

| CRM | Register URL |
|-----|--------------|
| HubSpot | `${PROD_APP_URL}/api/integrations/crm/webhook/hubspot?workspaceId=${PROD_WORKSPACE_UUID}` |
| Salesforce | `${PROD_APP_URL}/api/integrations/crm/webhook/salesforce?workspaceId=${PROD_WORKSPACE_UUID}` |

See [`OPS-HUBSPOT-LIVE-CONFIG.md`](./OPS-HUBSPOT-LIVE-CONFIG.md) and [`OPS-SALESFORCE-WEBHOOK.md`](./OPS-SALESFORCE-WEBHOOK.md).

---

## 8. Observability

| Service | Env var |
|---------|---------|
| Sentry | `${PROD_SENTRY_DSN}` |
| OTel | `${PROD_OTEL_EXPORTER_OTLP_ENDPOINT}` |

Blocked on full LLM trace UI until **A-GATE-002** (Langfuse decision).

---

## 9. Production verification

```powershell
cd nexus-social-app
npm run verify:production:code
# With prod env + running app:
npm run verify:production:uat
npm run verify:production:deploy
```

---

## 10. Human gates (must complete before external traffic)

| Gate | Runbook |
|------|---------|
| Meta App Review | [`OPS-META-APP-REVIEW.md`](./OPS-META-APP-REVIEW.md) |
| OAuth UAT | [`OPS-OAUTH-UAT-RUNBOOK.md`](./OPS-OAUTH-UAT-RUNBOOK.md) |
| Dify publish | [`OPS-DIFY-PUBLISH.md`](./OPS-DIFY-PUBLISH.md) |
| Executive sign-off | [`UAT-SIGNOFF-RESULTS.md`](./UAT-SIGNOFF-RESULTS.md) |

---

## Rollback

1. Revert deployment to previous image/tag.
2. Do **not** drop Supabase tables — forward-fix only.
3. Disable Inngest functions in dashboard if needed.
