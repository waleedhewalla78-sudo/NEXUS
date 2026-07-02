# Quickstart â€” Sprint 12 (AI CMO Foundation)

Sprint 12 builds orchestration backbone: hierarchy schema + event bus (Tasks 1â€“2 implemented); Tasks 3â€“10 await review.

---

## Prerequisites

- Feature 003 migrations applied (`000001`â€“`000010`)
- Node 20+, npm, Supabase linked project
- Redis running: `docker compose -f docker-compose.redis.yml up -d`

```powershell
cd D:\nexus-social-platform\nexus-social-app
npm ci
cp .env.example .env.local   # if needed
```

---

## Apply Sprint 12 Migrations

Apply **in order**: `000011` (hierarchy) then `000012` (foundation).

```powershell
# After linking Supabase
npm run db:migrate
```

**SQL Editor (manual apply):**

| State | File |
|-------|------|
| Fresh 004 schema | `supabase/migrations/RUN_IN_SQL_EDITOR_004_sprint12.sql` (000011 + 000012) |
| **000011 already applied** (e.g. `schema:verify:004` shows 3/11) | **`supabase/migrations/RUN_IN_SQL_EDITOR_004_000012_only.sql`** |

Or individual files:

- `supabase/migrations/20260624_000011_ai_cmo_hierarchy.sql`
- `supabase/migrations/20260624_000012_ai_cmo_foundation.sql`

Verify PostgREST reload (scripts end with `NOTIFY pgrst, 'reload schema'`).

```powershell
npm run schema:verify:004   # expect 11/11 when 000012 is applied
```

---

## Environment

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project |
| `SUPABASE_SERVICE_ROLE_KEY` | Migrations / server writes |
| `REDIS_URL` | Event bus + worker queues (default `redis://localhost:6379`) |

No new env vars for Sprint 12 Task 1â€“2.

---

## Run Checks

```powershell
npm run typecheck
npm test
npm run schema:verify   # 003 tables unchanged; new tables optional until remote apply
```

---

## Event Bus Smoke Test

```typescript
import {
  MarketingEventTypes,
  createInMemoryMarketingEventBusTransport,
  createMarketingEventBus,
} from '@/lib/events/marketing-event-bus';

const bus = createMarketingEventBus({
  transport: createInMemoryMarketingEventBusTransport(),
});

await bus.publish({
  type: MarketingEventTypes.COMPETITOR_PRICE_CHANGE,
  workspaceId: '<workspace-uuid>',
  payload: { competitor: 'Acme', change: '-10%' },
  idempotencyKey: 'test-smoke-1',
});
```

Requires Redis. Duplicate `idempotencyKey` returns `{ published: false, duplicate: true }`.

---

## Worker (unchanged from 003)

```powershell
npm run worker:dev   # separate terminal
npm run dev          # port 3005
```

Sprint 12 does not wire event bus consumers to worker yet (Task 4+).

---

## Whatâ€™s Next (after review)

1. Task 3 â€” `src/lib/sync/reconciler.ts`
2. Task 4 â€” Inngest client + campaign workflow skeleton
3. Tasks 5â€“8 â€” memory, FinOps, attribution, evaluation schemas
4. Tasks 9â€“10 â€” policy engine + content quality engine

See [tasks.md](./tasks.md).
