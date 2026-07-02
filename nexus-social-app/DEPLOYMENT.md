# Production Deployment Guide — Nexus Social Platform

## Pre-flight checklist

Run the automated gate before every production deploy:

```powershell
cd nexus-social-app
powershell -ExecutionPolicy Bypass -File scripts/preflight-production.ps1
```

Manual checklist:

| Step | Command / action | Pass criteria |
|------|------------------|---------------|
| 1. Database | Run `src/sql/essential_bootstrap.sql` then `schema_patch.sql` in Supabase | `npm run schema:verify` exits 0 |
| 2. Environment | Copy `.env.example` → `.env` (Docker) or host env | All production vars set (see below) |
| 3. Build | `npm run build` | Completes without error |
| 4. Tests | `npm run test` + `npx playwright test e2e/smoke.spec.ts` | All green |
| 5. Health | `curl http://localhost:3005/api/health` | `"status":"ok"`, `"db":"up"` |
| 6. Worker | `npm run worker:dev` or Docker `worker` service | Redis BRPOP active |
| 7. Smoke load | `npm run load-test` | Checks pass (see note on p95) |

---

## Required environment variables (production)

These are enforced at **runtime** via `verifyEnv()` in `src/instrumentation.ts`:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side admin access |
| `REDIS_URL` | AI queue + rate limits (e.g. `redis://redis:6379`) |
| `DIFY_API_KEY` | Default Dify API key |
| `INTERNAL_TOOL_SECRET` | Internal tool auth |
| `CHATWOOT_WEBHOOK_SECRET` | HMAC verification for Chatwoot webhooks |
| `APPROVAL_HMAC_SECRET` | Refund approval magic links |
| `STRIPE_SECRET_KEY` | Billing |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook verification |

Recommended additional vars:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_APP_URL` | Public URL for invite/reset redirects |
| `CHATWOOT_BASE_URL` | Live inbox |
| `CHATWOOT_API_TOKEN` | Chatwoot REST API |
| `CHATWOOT_ACCOUNT_ID` | Chatwoot account |
| `SENTRY_DSN` | Error tracking |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Traces → collector |

---

## Docker deployment (recommended)

```powershell
# 1. Configure production env
copy .env.example .env
# Edit .env with real secrets

# 2. Apply database migrations in Supabase SQL Editor first

# 3. Build and start stack
docker compose -f docker-compose.prod.yml up -d --build

# 4. Verify
curl http://localhost:3005/api/health
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs worker --tail 50
```

Services started:

| Service | Role |
|---------|------|
| `web` | Next.js standalone on port 3000 |
| `worker` | Redis AI orchestration daemon |
| `redis` | Job queue + rate limiting |
| `otel-collector` | OpenTelemetry trace ingestion |

---

## Standalone Node deployment

```powershell
npm ci
npm run build
# Set all production env vars, then:
npm run start:prod
# In a separate process:
npm run worker:dev
```

The build outputs to `.next/standalone/` (see `Dockerfile`).

---

## Local live stack (Redis + AI worker)

```powershell
docker compose -f docker-compose.redis.yml up -d
npm run worker:dev
```

Or combined: `npm run live:stack`

Health should show `redis: up`. For live inbox (not demo), add to `.env.local`:

```
CHATWOOT_BASE_URL=http://localhost:3003
CHATWOOT_API_TOKEN=your_token
CHATWOOT_ACCOUNT_ID=1
```

Configure Dify per workspace at `/settings/ai-agent`.

### AI agent test setup

1. Create a **Chat app** in [Dify Cloud](https://cloud.dify.ai) (or self-host Dify).
2. Copy **App API Key** from API Access (starts with `app-`).
3. Add to `.env.local`:
   ```
   DIFY_BASE_URL=https://api.dify.ai
   DIFY_API_KEY=app-your-key-here
   ```
4. Run:
   ```powershell
   npm run ai:setup
   npm run ai:verify
   npm run dev
   ```
5. Open `/settings/ai-agent` → paste keys → **Test Dify connection**.
6. For inbox auto-replies: Redis + `npm run worker:dev` + Chatwoot webhook configured.

---

1. Sign in at `https://your-domain/login`
2. Dashboard loads at `/` with KPIs
3. `/admin` shows health tiles (db: up)
4. Send test Chatwoot webhook → worker logs show enqueue/process
5. Run `npm run seed:walkthrough` once for demo workspace (optional)

---

## Rollback

```powershell
docker compose -f docker-compose.prod.yml down
# Redeploy previous image tag or git revision
git checkout <previous-tag>
docker compose -f docker-compose.prod.yml up -d --build
```

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Container exits on start | Check logs for `Missing required environment variables` |
| Build fails on env | Build skips runtime check; ensure `.env` is set before `docker compose up` |
| Health 503 db:down | Verify Supabase URL/keys; run bootstrap SQL |
| Inbox demo only | Set `CHATWOOT_*` and seed `chatwoot_inbox_workspace_map` |
| Worker crash `Cannot find module` | Rebuild Docker image (worker now bundled via esbuild) |
| `npm run worker:dev` fails | Uses esbuild bundle to `dist-dev/worker.js` — ensure Node 20+ |
| PostgREST 42703 | Re-run `schema_patch.sql`; `NOTIFY pgrst, 'reload schema'` |

Use **localhost** in dev URLs, not `127.0.0.1`.
