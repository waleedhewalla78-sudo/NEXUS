# Program Plan — Post DEPLOY-GATE + Phase 7b

**Date:** 2026-06-27  
**Stack:** Next.js 16 · Supabase · Inngest · Redis · Qdrant · Ollama · Recharts  
**Constitution:** `nexus-social-app/CONSTITUTION.md` v1.3.0

---

## Phase REMEDIATE — ✅ Complete

SSCADA Loops 1–4: audit schema, publishers/media, FinOps timeout, operator docs.

---

## Phase DEPLOY-GATE — Automated ✅ / Human ⏳

| Gate | Command | Status |
|------|---------|--------|
| Schema | `npm run uat:check-schema` | PASS |
| Postman B→A | `npm run uat:postman-ab` | PASS |
| Live integration | `npm run test:live-integration` | PASS 5/5 |
| 003 live OAuth | `npm run uat:t053` | Human |
| Meta review | `docs/OPERATOR-GATES.md` | Human |
| Sign-off | `docs/UAT-SIGNOFF-RESULTS.md` | Partial |

---

## Phase 005-7b — Product Intelligence UI ✅

| Deliverable | Path | Status |
|-------------|------|--------|
| Brief wizard UI | `src/app/ai-cmo/campaigns/new/` | ✅ |
| Session brief enqueue | `src/actions/campaign-brief-ui.ts` | ✅ |
| Shared brief enqueue | `src/lib/ai-cmo/campaign-brief/enqueue-from-brief.ts` | ✅ |
| Intelligence dashboard | `src/app/ai-cmo/intelligence/` | ✅ |
| CSV import (session) | `src/actions/analytics-import-ui.ts` | ✅ |
| Shared import report | `src/lib/analytics/paid-media/import-report.ts` | ✅ |
| Quant ANALYTICS_SYNCED | `src/lib/analytics/paid-media/emit-quant-hints.ts` | ✅ |
| Calendar HTML export | `src/lib/ai-cmo/exports/content-calendar-html.ts` | ✅ |
| AI CMO nav layout | `src/app/ai-cmo/layout.tsx` | ✅ |

**Validation:** Log in → `/ai-cmo/campaigns/new` submit brief → poll job; `/ai-cmo/intelligence` upload CSV → charts; calendar HTML download.

---

## Phase PRODUCTION — Next (human + DevOps)

1. Meta App Review + token mapping
2. Populate `.env.production.template` → prod env
3. Inngest Cloud signing key + serve URL
4. Sentry DSN
5. Staging smoke on prod Supabase

---

## Phase 005-7c — Backlog

| Item | Path |
|------|------|
| Higgsfield prompt contract | `src/lib/ai-cmo/creative/higgsfield-prompt.ts` |
| XLSX parse (optional `xlsx` dep) | import route |
| Persist import snapshots | `ai_cmo_media_imports` table |

---

## Phase PLATFORM-P2 — Deferred

- TikTok/Snapchat live publisher adapters
- SAML IdP production
- Pentest (S17)

---

## Constitution Check (Phase 7b)

| Gate | Result |
|------|--------|
| Reconciler-only writes | PASS — UI reads + enqueue only |
| 003 isolation | PASS |
| No agent rewrites | PASS |

---

## Tech stack (unchanged)

- **Frontend:** Next.js App Router, Tailwind, Recharts (existing dep)
- **Auth UI:** Supabase session via server actions
- **Auth API:** Workspace API keys (`x-api-key`) for Postman/UAT
- **Jobs:** Inngest L3 mesh + Redis campaign job store
- **DB:** Supabase Postgres + RLS
