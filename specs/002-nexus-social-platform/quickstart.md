# Quickstart: Nexus Social Platform Validation

End-to-end validation guide for Waves 0–2. Prerequisites assume Windows/PowerShell; adapt for Unix.

---

## Prerequisites

| Requirement | Verify |
|-------------|--------|
| Node.js 22+ | `node -v` |
| Docker Desktop (running) | `docker info` |
| Supabase project with migrations applied | See [Migration Order](./data-model.md#migration-order-recommended) |
| `.env` populated | Copy from `.env.example`; include `INTERNAL_TOOL_SECRET`, `REDIS_URL`, `CHATWOOT_WEBHOOK_SECRET` |

---

## 1. Start infrastructure

```powershell
cd D:\nexus-social-platform\nexus-social-app

# Redis
docker compose -f docker-compose.redis.yml up -d

# Optional: full integration stack (Chatwoot, Dify, Activepieces)
# See sibling repos: chatwoot/, dify/, activepieces/
```

---

## 2. Start application processes

**Terminal A — Next.js:**
```powershell
cd D:\nexus-social-platform\nexus-social-app
npm install
npm run dev
# → http://localhost:3000
# If port 3000 is occupied, stop the old process first, or Next.js will use 3001.
```

**One-command full prepare (Docker + dev + worker + seed + verify):**
```powershell
npm run prepare:walkthrough
```

**Seed sample data only** (requires live Supabase + migrations applied):
```powershell
# Set your auth user UUID after first login:
# WALKTHROUGH_USER_ID=<uuid> in .env.local
npm run seed:walkthrough
```

Sample workspace ID: `11111111-1111-1111-1111-111111111111` (slug: `walkthrough-demo`)

**One-command verification (requires dev server running):**
```powershell
npm run dev          # Terminal A - use http://127.0.0.1:3000
npm run walkthrough  # Terminal B - unit + typecheck + E2E + health
```

**Tips:**
- Prefer `127.0.0.1` over `localhost` on Windows to avoid IPv6 routing delays.
- First webhook request after `npm run dev` may take ~30s while Turbopack compiles; E2E global setup warms the route automatically.
- Ensure `REDIS_URL=redis://localhost:6379` is set in `.env.local` (see `.env.example`).

**Terminal B — AI worker (required for US4):**
```powershell
cd D:\nexus-social-platform\nexus-social-app
npx ts-node src/bin/worker.ts
```

**Terminal C — Migration worker (optional, Sprint 10):**
```powershell
npx ts-node src/bin/migration-worker.ts
```

---

## 3. Wave 0 — Production hardening checks

Run after completing `specs/001-production-readiness-hardening/tasks.md` T005–T022.

| Check | Command / action | Expected |
|-------|------------------|----------|
| Unit tests | `npm test` | 7/7 pass |
| Health | `curl http://localhost:3000/api/health` | Redis + DB status accurate; 503 if down |
| Kill switch | Set `is_globally_disabled=true` in DB; POST webhook | `{ "status": "ignored", "reason": "global_kill_switch_active" }` |
| HITL link | Trigger refund tool; tamper token | 403 on tampered link |
| API gateway | Call `/api/v1/posts` with bad key | 401 |

**Playwright (AI critical paths):**
```powershell
$env:NEXT_PUBLIC_APP_URL="http://localhost:3000"
npm run test:e2e
```

---

## 4. Wave 1 — Secure MVP checks

| Check | Command / action | Expected |
|-------|------------------|----------|
| Login gate | Visit `/` without session | Redirect to `/login` |
| Webhook auth | POST `/api/webhooks/chatwoot-ai` without signature | 403 |
| Kill switch UI | Visit `/settings/ai-agent` as admin | Toggle saves to `ai_agent_configs` |
| Workspace scope | Navbar lists only member workspaces | Zustand `workspaceId` set |

### SEC-01 Multi-tenant RLS
1. Login as `admin@competitor.com` (Workspace B)
2. Attempt to fetch Workspace A post by UUID
3. **Expected:** Empty result or 403

### AI-01 PII redaction
1. Open inbox; compose message containing `test@email.com` and phone number
2. Request AI suggestion
3. **Expected:** Outbound Dify request body contains `[REDACTED_EMAIL]` / redacted phone (network tab or log inspection)

### Content flow (US2)
1. `/calendar` → create post with media + AI caption
2. **Expected:** Post on calendar; credit deducted once

### AI orchestration (US4)
1. POST sample payload to `/api/webhooks/chatwoot-ai` (see `scripts/e2e_validation.ps1`)
2. **Expected:** Worker logs job; Chatwoot receives reply or HITL private note

```powershell
powershell -ExecutionPolicy Bypass -File scripts/e2e_validation.ps1
```

---

## 5. Wave 2 — Billing & analytics

### BILL-01 Credit exhaustion
1. Set workspace credits to 10
2. Fire 11 concurrent AI caption requests (k6 or script)
3. **Expected:** 11th blocked; ledger never negative

### AI performance dashboard
1. `/analytics/ai-performance`
2. **Expected:** Resolution rate, edit rate widgets (real data, not demo fallback)

### Cron eval
```powershell
curl -H "Authorization: Bearer $env:CRON_SECRET" http://localhost:3000/api/cron/ai-eval
```

---

## 6. Load tests (Wave 4)

Requires [k6](https://k6.io/) installed:

```powershell
npm run load-test          # post creation — p95 < 500ms @ 50 VUs
npm run load-test:ai       # webhooks — 100/s, queue depth < 500
```

---

## 7. Launch sign-off checklist (SC-011)

- [x] Core auth gate, webhook HMAC, API v1 routes implemented
- [x] Unit tests and typecheck passing
- [x] Migration order documented + apply script
- [x] Worker + Redis in production compose
- [ ] SEC-01, AI-01, AI-02, BILL-01, PORT-01 — run against live stack
- [ ] k6 thresholds met (requires k6 + running services)
- [ ] Kill switch drill per `docs/AI_INCIDENT_RUNBOOK.md` (manual ops)

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| AI never replies | Worker not running | Start `src/bin/worker.ts` |
| `/api/health` Redis down | Docker not running | `docker compose -f docker-compose.redis.yml up -d` |
| Login works but empty data | Supabase migrations missing | Run ordered SQL from data-model |
| 500 on all pages | Stale dev server | Kill port 3000 processes; `npm run dev` |
| Webhook 200 but no action | Kill switch / canary 0% | Check `ai_agent_configs` flags |

See [contracts/webhooks-inbound.md](./contracts/webhooks-inbound.md) and [plan.md](./plan.md) for wave dependencies.
