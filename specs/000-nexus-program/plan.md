# Program Plan — Phase D Implementation

**Date:** 2026-07-06  
**Tech stack:** Next.js 16 · Supabase · Inngest Cloud · Upstash Redis · GHCR · Hermes VPS · Dify · OpenRouter

---

## Phase D engineering (shipped this cycle)

| Task | Deliverable | Status |
|------|-------------|--------|
| PD-ENG-001 | `.env.production.template` | ✅ |
| PD-ENG-002 | `scripts/verify-phase-d-gates.ts` | ✅ |
| PD-ENG-003 | `docs/OPS-PHASE-D-INTEGRATION.md` | ✅ |
| PD-ENG-004 | `specs/000-nexus-program/phase-d-spec.md` | ✅ |
| PD-ENG-005 | `npm run verify:phase-d` scripts | ✅ |
| PD-ENG-006 | CL-044–047 clarifications | ✅ |

---

## Phase D operator plan (not code)

### Week 1 — Deploy + secrets

1. Hermes: `git pull` + `docker compose -f docker-compose.prod.yml up -d`
2. Copy `.env.production.template` → `.env.production`; fill vault
3. `npm run verify:phase-d:report` → resolve FAILs
4. Inngest sync + `verify:inngest-cloud`

### Week 1–2 — OAuth fast path

1. Register LinkedIn + X prod OAuth apps
2. Connect at `https://nexussocial.tech/settings`
3. Schedule test publish; confirm worker logs
4. Record T053/T055 in UAT-SIGNOFF

### Week 2–4 — Meta (parallel)

1. Submit App Review (B1)
2. On approval: connect Meta OAuth + SQL `meta_app_review_status=approved`
3. FB/IG publish smoke test

### Week 2 — Certification

1. `qa:enterprise:report` with live URL
2. `close-section-b.ps1`
3. B3 executive sign-off

### Commercial (founder-led)

1. `generate:pilot-report` on prod workspace
2. Close sale → S4 provision script (eng, post-sign)
3. Payment → Sprint 6 Ready → Pit Crew build

---

## Integration architecture (production)

```
Hermes VPS
├── nexus-social-app (Next.js) ──► Supabase / Inngest / Redis
├── nexus-social-worker ──────────► publish-due-posts + analytics
├── otel-collector ───────────────► Sentry
└── Caddy ────────────────────────► SSL → :3000

LLM: Dify (primary) → OpenRouter (fallback) — no Ollama
Social: OAuth tokens in workspace_social_connections (encrypted)
```

---

## Deferred (gated)

| Item | Gate | Plan reference |
|------|------|----------------|
| `provision-pilot-client.ts` | Signed pilot CL-033 | PD-COM-002 |
| Pit Crew `/admin` | Payment CL-036 | PD-COM-004 |
| Migration `000014` | A-GATE-003 | Sprint 20 |
