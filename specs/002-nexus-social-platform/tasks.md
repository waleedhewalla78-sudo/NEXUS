# Tasks: Nexus Social Platform (Feature 002)

**Input**: Design documents from `specs/002-nexus-social-platform/`

**Prerequisites**: Wave 0 complete (`specs/001-production-readiness-hardening/tasks.md` — all T001–T024 done)

**Organization**: Tasks grouped by wave and user story. Wave 0 is satisfied by feature 001; this file covers Waves 1–4.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Wave 1 Setup (Secure MVP Foundation)

- [x] T001 [P] Complete `.env.example` with Redis, Stripe, webhook secrets, and approval keys in `nexus-social-app/.env.example`
- [x] T002 [P] Expand `verifyEnv()` required vars in `nexus-social-app/src/lib/verify-env.ts`
- [x] T003 [P] Add AI worker service to `nexus-social-app/docker-compose.redis.yml`
- [x] T004 [P] Fix README migration paths in `nexus-social-app/README.md`

---

## Phase 2: Wave 1 Foundational (Auth & Webhooks)

- [x] T005 [P] Create Chatwoot webhook HMAC verifier in `nexus-social-app/src/lib/webhook-auth.ts`
- [x] T006 [P] Create internal bearer auth helper in `nexus-social-app/src/lib/internal-auth.ts`
- [x] T007 Add login gate and public-path allowlist in `nexus-social-app/src/middleware.ts`
- [x] T008 [P] Add conditional dashboard shell in `nexus-social-app/src/components/AppShell.tsx` and wire in `src/app/layout.tsx`

---

## Phase 3: User Story 1 — Multi-Tenant Auth (US1)

- [x] T009 [US1] Filter workspaces by membership and sync Zustand store in `nexus-social-app/src/components/Navbar.tsx`

---

## Phase 4: User Story 2 — Content Engine (US2)

- [x] T010 [US2] Add session + workspace membership check in `nexus-social-app/src/actions/createPost.ts`

---

## Phase 5: User Story 3 — Unified Inbox (US3)

- [x] T011 [US3] Verify inbound webhook signatures on `nexus-social-app/src/app/api/webhooks/chatwoot-ai/route.ts`
- [x] T012 [P] [US3] Verify signatures on `nexus-social-app/src/app/api/webhooks/chatwoot-ai-feedback/route.ts`
- [x] T013 [P] [US3] Verify signatures on `nexus-social-app/src/app/api/webhooks/chatwoot-csat/route.ts`

---

## Phase 6: User Story 5 — HITL & Tools (US5)

- [x] T014 [US5] Session-based auth in `nexus-social-app/src/actions/clone-template.ts` (remove client mock userId)

---

## Phase 7: User Story 6 — Billing (US6)

- [x] T015 [US6] Remove Stripe mock fallback key in `nexus-social-app/src/app/api/webhooks/stripe/route.ts`

---

## Phase 8: User Story 7 — Analytics & Operator Controls (US7)

- [x] T016 [US7] Remove production demo analytics fallbacks in `nexus-social-app/src/actions/getAnalytics.ts`
- [x] T017 [US7] Create AI agent settings server actions in `nexus-social-app/src/actions/ai-agent-settings.ts`
- [x] T018 [US7] Create kill switch / canary admin UI in `nexus-social-app/src/app/settings/ai-agent/page.tsx`

---

## Phase 9: User Story 8 — Public API & Outbound Webhooks (US8)

- [x] T019 [US8] Implement outbound webhook delivery in `nexus-social-app/src/lib/webhooks/dispatch.ts`
- [x] T020 [US8] Fix automations builder to use session user in `nexus-social-app/src/app/automations/builder/page.tsx`

---

## Phase 10: User Story 9 — Enterprise & Custom Domains (US9)

- [x] T021 [US9] Add internal auth to CRM sync in `nexus-social-app/src/app/api/crm/sync/route.ts`
- [x] T022 [US9] Implement white-label custom domain route at `nexus-social-app/src/app/_custom/[hostname]/[[...slug]]/page.tsx`

---

## Phase 11: Wave 4 — Launch Validation (Documentation)

- [x] T023 [P] Update quickstart validation notes in `specs/002-nexus-social-platform/quickstart.md`
- [x] T024 [P] Run unit tests and typecheck (`npm test`, `npm run typecheck`) in `nexus-social-app/`

---

## Phase 12: Wave 1–2 Remediation (Session & Pages)

- [x] T025 [P] Add server session helper in `nexus-social-app/src/lib/auth/server-session.ts`
- [x] T026 [P] Fix analytics/calendar/reputation pages to use session workspace context
- [x] T027 [P] Fix sentiment dashboard to use Zustand workspace store
- [x] T028 [US2] Derive userId from session in `nexus-social-app/src/actions/generateCaption.ts`

---

## Phase 13: Wave 2–3 Platform Hardening

- [x] T029 [US8] Redis-backed outbound webhook delivery with retries in `src/lib/webhooks/delivery.ts` + `src/bin/worker.ts`
- [x] T030 [US8] Wire Activepieces execution in `src/jobs/execute-automation.ts`
- [x] T031 [US5] Shopify-backed order lookup with stub fallback in `src/app/api/tools/check-order-status/route.ts`
- [x] T032 [US9] Client portal RLS via `client_users` in `src/app/(client-portal)/dashboard/page.tsx`
- [x] T033 [US8] Add `GET /api/v1/workspaces` route
- [x] T034 [US9] Enterprise SSO settings page at `src/app/settings/sso/page.tsx`

---

## Phase 14: Ops & Migrations

- [x] T035 [P] Document migration order in `supabase/migrations/README.md`
- [x] T036 [P] Add `scripts/apply-migrations.ps1` for ordered SQL apply
- [x] T037 [P] Fix prod worker service in `docker-compose.prod.yml`
- [x] T038 [P] Fix Sidebar AI agent link to `/settings/ai-agent`

---

## Phase 15: Parallel Tracks (Documented)

- [x] T039 [P] Add `nexus-mobile/README.md` parallel track scaffold
- [x] T040 [P] Add `docs/ML_SERVICE.md` integration guide

---

## Phase 16: Final Verification

- [x] T041 [P] Run unit tests and typecheck after remediation

---

## Phase 17: E2E & Launch QA

- [x] T042 [P] Add `x-e2e-test` webhook fixture for AI-02 kill switch E2E in `chatwoot-ai/route.ts`
- [x] T043 [P] Update Playwright AI-02 test with E2E header + graceful skip when server stale

---

## Phase 18: Full Walkthrough Automation

- [x] T044 [P] Add `scripts/full-walkthrough.ps1` and `npm run walkthrough`
- [x] T045 [P] Fix OTEL span cleanup on webhook early returns
- [x] T046 [P] Run full walkthrough (unit + typecheck + E2E + health)
- [x] T047 [P] Fix Turbopack root, REDIS_URL default, E2E IPv4 + retry resilience

---

## Dependencies

```text
Phase 1 (T001–T004) ──► Phase 2 (T005–T008) ──► Phases 3–10 (parallel where [P])
                                                      │
                                                      ▼
                                               Phase 11 (T023–T024)
```

## Parallel Example

```bash
# After Phase 2 completes, launch webhook signature tasks together:
T011, T012, T013  # chatwoot webhook routes
T015, T016        # stripe + analytics (independent files)
```
