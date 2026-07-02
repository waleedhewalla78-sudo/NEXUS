# Quickstart: Real Integrations Phase 1 (Epic 1 + 3)



Validate real publishing and consolidated schema on a staging workspace.



> Merged from `specs/003-production-saas/quickstart.md`. Canonical path: `specs/003-real-integrations-production/`.


## Project tracking (Notion)

- **Hub**: https://app.notion.com/p/3886f21f521a81dd8afddc322d192c42
- **Tasks**: https://app.notion.com/p/33b8c931e9d54ae184dd115672923ddc
- **Status**: https://app.notion.com/p/3886f21f521a818f92b0d331dfb4e6fd

Repo source of truth: [tasks.md](./tasks.md).

**Notion sync:** After updating checkboxes in `tasks.md`, re-run Notion sync (ask the agent: *"Sync Feature 003 tasks to Notion"*) so the Tasks DB, Status Dashboard, and Hub snapshot stay aligned.



## Prerequisites



- Node.js 22+

- Redis (`docker compose -f docker-compose.redis.yml up -d`)

- Supabase project (remote) or local Postgres

- Meta sandbox Page + Page access token (or use env fallback)

- `TOKEN_ENCRYPTION_KEY` â€” generate with `openssl rand -hex 32`



## 1. Configure environment



```bash

cd nexus-social-app

cp .env.example .env.local

```



Set at minimum:



- `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

- `REDIS_URL`

- `TOKEN_ENCRYPTION_KEY`

- `FACEBOOK_PAGE_ID`, `FACEBOOK_PAGE_ACCESS_TOKEN` (sandbox tokens)



## 2. Apply schema (Epic 3)



**Option A â€” Supabase CLI (linked project):**



```bash

npm run db:link

npm run db:migrate

```



**Option B â€” Local Postgres / SQL Editor:**



Apply files in `supabase/migrations/` in filename order (through `20260623_000007_analytics_rpc.sql`).



**Option C â€” psql:**



```powershell

# DATABASE_URL from env, .env.local, or -DatabaseUrl

npm run db:migrate:local -- -DatabaseUrl "postgresql://postgres:...@db....supabase.co:5432/postgres"

```



Verify:



```bash

npm run schema:verify

```



## 3. Seed encrypted Page connection (manual OAuth substitute)



```bash

npm run seed:social-connection -- <workspace-uuid> facebook <page-id> <page-access-token>

```



## 4. Start worker + app



```bash

npm run worker:dev

npm run dev

```



## 5. Schedule a post



Create a post in the calendar with platform `Facebook`, status `scheduled`, and `scheduled_at` within the next minute.



## 6. Confirm publish



Within ~60s the worker should set:



- `status = published`

- `external_post_id` populated

- `published_at` timestamp



Check the Facebook Page for the live post.



## Troubleshooting



| Symptom | Fix |

|---------|-----|

| PGRST205 missing table | Re-run migrations; ensure NOTIFY migration applied |

| `TOKEN_ENCRYPTION_KEY` error | Must be 64 hex chars |

| Post stays `scheduled` | Confirm `npm run worker:dev` running and `PUBLISHING_ENABLED=true` |

| `failed` + token error | Re-seed connection or refresh Page token |

| Analytics empty after publish | Apply `20260623_000007_analytics_rpc.sql`; wait for 6h sync or lower `SYNC_ANALYTICS_INTERVAL_MS` in dev |

| Demo data in dev | Set `DEMO_ANALYTICS_ENABLED=true` only when intentionally demoing; otherwise uses real RPC data |



## CI



Migration SQL is validated on PRs via `.github/workflows/supabase-migrations.yml` (Postgres service + ordered apply).



## Full-stack compose (Epic 4)



From the **monorepo root**:



```bash

cp .env.full-stack.example .env.full-stack

# Core only (app + worker + redis)

docker compose --env-file .env.full-stack -f docker-compose.full-stack.yml up -d --build



# Core + Chatwoot + Dify + Activepieces

docker compose --env-file .env.full-stack -f docker-compose.full-stack.yml --profile full up -d --build



bash scripts/wait-for-full-stack.sh

WAIT_INTEGRATIONS=true bash scripts/wait-for-full-stack.sh

```



Apply migration `20260623_000007_analytics_rpc.sql` before expecting engagement metrics.



Verify:



```bash

curl http://localhost:3005/api/health

cd nexus-social-app && npm run schema:verify

```


