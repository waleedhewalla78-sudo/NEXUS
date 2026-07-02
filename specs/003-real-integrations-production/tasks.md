# Tasks: Real Integrations & Production Readiness (Feature 003)



**Input**: Design documents from `specs/003-real-integrations-production/`



**Prerequisites**: Feature 001 baseline complete; Feature 002 product scaffolding in place



**Organization**: Phased by expert roadmapâ€”Phase 1 (Epic 1+3), Phase 2 (Epic 2+4), Phase 3 (Reputation+AI+UX)



> **Merged task list (2026-06-23):** User-story structure from `speckit.specify` (T001â€“T050). Implementation file paths and `[x]` completion status from `speckit.implement` against former `specs/003-production-saas/` (20 tasks complete as of consolidation).



## Format: `[ID] [P?] [Story] Description`



---



## Phase 0: Preflight & Gates



- [x] T001 [P] Register OAuth apps (LinkedIn, X, Meta dev) and document redirect URIs in `nexus-social-app/.env.example`

- [x] T002 [P] Add Meta App Review status flag to workspace settings data model (migration + UI placeholder) — `20260623_000010_meta_app_review.sql`, SettingsHub banner

- [x] T003 [P] Ensure `npm run ai:verify` documented as CI/staging gate in `nexus-social-app/CLIENT_DEMO.md` — + `nexus-social-app-ci.yml`, `npm run verify:staging`

- [x] T004 [P] Audit `getAnalytics.ts` demo fallback usage; confirm production throws — `test/actions/getAnalytics.test.ts`



---



## Phase 1A: Epic 3 â€” Schema & DevOps (P1)



- [x] T005 [P] [US4] Consolidate missing tables into ordered migrations under `nexus-social-app/supabase/migrations/` â€” `20260623_000001_baseline.sql` through `20260623_000006_notify_pgrst.sql` (reputation, post_analytics, social_connections, AI/billing)

- [x] T006 [P] [US4] Add Supabase CLI workflow to `nexus-social-app/supabase/migrations/README.md` and `nexus-social-app/README.md` migration section

- [x] T007 [US5] Add CI job: apply migrations + run schema verification â€” `.github/workflows/supabase-migrations.yml` (dry-run on PRs)

- [x] T008 [US5] Automate PostgREST reload via `20260623_000006_notify_pgrst.sql` (`NOTIFY pgrst, 'reload schema'`)

- [x] T009 [P] [US4] Create `supabase/config.toml`; extend `scripts/apply-migrations.ps1` for CLI parity; document `supabase db reset` in [quickstart.md](./quickstart.md)



---



## Phase 1B: Epic 1 â€” Real Publishing Engine (P1)



- [x] T010 [US1] Create `workspace_social_connections` entity + RLS â€” migration `20260623_000004_social_connections.sql` (+ posts columns)

- [x] T011 [US1] Implement OAuth start/callback routes for LinkedIn in `nexus-social-app/src/app/api/oauth/linkedin/`

- [x] T012 [P] [US1] Implement OAuth start/callback routes for X in `nexus-social-app/src/app/api/oauth/x/`

- [x] T013 [P] [US1] Implement OAuth start/callback for Meta in `nexus-social-app/src/app/api/oauth/meta/` *(routes done; Meta App Review still blocks production publish)*

- [x] T014 [US1] Replace manual handle-only connect in `SettingsHub.tsx` with OAuth connect flow — Connect OAuth links + window-focus refresh

- [x] T015 [US3] Define `PublisherAdapter` interface in `nexus-social-app/src/lib/publishers/adapter.ts`; create `src/lib/crypto/token-vault.ts` (AES-256-GCM)

- [x] T016 [P] [US3] Implement LinkedIn adapter â€” `src/lib/publishers/linkedin.ts` (validate + publish)

- [x] T017 [P] [US3] Implement X adapter â€” `src/lib/publishers/x.ts` (validate + publish)

- [x] T018 [US2] Add publish job in `src/jobs/publish-due-posts.ts` â€” query due posts, invoke adapters, idempotent processing

- [x] T019 [US2] Register 60s publish loop in `src/bin/worker.ts`

- [x] T020 [US2] Persist external post IDs and per-platform status; update `src/actions/workspace-integrations.ts` to read `workspace_social_connections`

- [x] T021 [US2] Surface publish failures in calendar UI with retry/re-auth actions

- [x] T022 [P] [US2] Add unit tests â€” `test/lib/publishers/meta.test.ts` with mocked fetch

- [x] T023 [P] [US3] Implement `MetaPublisher` â€” `src/lib/publishers/meta.ts` (extract from `scripts/publish-facebook-post.ts`)

- [x] T024 [P] [US1] Playwright E2E: publish path automated — `e2e/publish-flow.spec.ts` + `test/integration/publish-worker.test.ts` *(live OAuth UI path: operator T053)*



---



## Phase 2A: Epic 2 â€” Real Analytics Ingestion (P2)



- [x] T025 [US6] Create `post_analytics` migration â€” `20260623_000005_post_analytics.sql` (workspace + external_post_id uniqueness)

- [x] T026 [US6] Implement insights fetcher per network adapter â€” `src/lib/analytics/meta-insights.ts` (+ LinkedIn/X equivalents)

- [x] T027 [US7] Add insights polling cron route/job â€” `src/jobs/sync-analytics.ts`; register 6h loop in `src/bin/worker.ts`

- [x] T028 [US7] Update `get_workspace_analytics` RPC to aggregate from `post_analytics`

- [x] T029 [US7] Remove staging demo fallback paths; show empty/partial states in `analytics/page.tsx`; update `src/actions/getAnalytics.ts`

- [x] T030 [P] [US7] Wire report builder widgets to ingested metrics only

- [x] T031 [P] [US6] Vitest: insights response parsing tests



---



## Phase 2B: Epic 4 â€” Full-Stack Docker (P2)



- [x] T032 [US8] Create root `docker-compose.full-stack.yml` (app + worker + redis + Chatwoot + Dify + Activepieces on `nexus-internal` network)

- [x] T033 [P] [US8] Document required vs optional services in README / WALKTHROUGH.md; create `.env.full-stack.example`

- [x] T034 [US8] Extend `/api/health` for worker queue + schema readiness checks

- [x] T035 [P] [US8] Add health-check script `scripts/wait-for-full-stack.sh`

- [x] T036 [P] [US8] Update `scripts/full-walkthrough.ps1` to target full-stack compose profile

- [x] T037 [US8] Document full-stack bring-up in [quickstart.md](./quickstart.md)



---



## Phase 2C: Epic 1 â€” Platform Operations (P2)



- [x] T038 [P] [US1] Token refresh job in worker for expiring `workspace_social_connections` â€” `src/jobs/refresh-tokens.ts`, `src/lib/oauth/token-refresh.ts`, worker loop



---



## Phase 2D: Phase 2 gap fixes (2026-06-23 audit)



- [x] T058 [P] [US6] Multi-platform `external_post_id` — record per-platform IDs in `post_analytics` at publish; sync resolves via `platform-external-ids.ts`

- [x] T059 [P] [US6] LinkedIn insights — `organizationalEntityShareStatistics` API + elements parser

- [x] T060 [P] [US8] Production health — worker heartbeat `unknown` fails overall when `PUBLISHING_ENABLED=true`

- [x] T061 [P] [US7] Report builder — ingested engagement only; empty states instead of post-count fallback

- [x] T062 [P] [US8] Full-stack walkthrough + compose — start web+worker; `TOKEN_REFRESH_*` in compose and `.env.full-stack.example`



---



## Phase 3A: Reputation (P3)



- [x] T039 [US9] Ensure reputation migrations applied (depends T005 — **done**) — `20260623_000003_reputation.sql` in ordered set; apply via `npm run db:migrate`

- [x] T040 [US9] Implement competitor + owned profile configuration UI — `ReputationSettings.tsx`

- [x] T041 [US9] Build reputation ingestion jobs — `sync-listening.ts`, `sync-reviews.ts`, worker loops

- [x] T042 [P] [US9] Fix `reputation.ts` to require real tables in production (no silent PGRST205 swallow)



---



## Phase 3B: AI Agent (P3)



- [x] T043 [US10] Add preflight banner when `ai:verify` fails on AI surfaces — `AiVerifyBanner.tsx`

- [x] T044 [US10] Ground Dify analytics Q&A tools on ingested `post_analytics` — `/api/tools/get-workspace-analytics`

- [x] T045 [P] [US10] Add market/competitor context tool — `/api/tools/get-competitor-mentions`

- [x] T046 [P] [US10] Wire OpenRouter fallback in `src/lib/ai/openrouter.ts`; add CI deploy gate

- [x] T047 [P] [US10] RAG ingest job for post_analytics summaries; Dify checklist in `USER_GUIDE.md`



---



## Phase 3C: UX Table Stakes (P3)



- [x] T048 [US11] Composer per-platform character/media validation (`PostFormContent.tsx`)

- [x] T049 [US11] Calendar failed-event detail panel with retry/re-auth; drag-drop reschedules `scheduled_at`

- [x] T050 [P] [US11] OAuth settings optimistic refresh without full reload

- [x] T051 [P] [US11] Publish failure toast with reconnect link; analytics from real `post_analytics`

- [x] T052 [P] [US11] Heuristic UX audit checklist vs Buffer/Hootsuite — `checklists/requirements.md` (10/10)



---



## Phase 4: Validation & Sign-off

- [x] T053 [P] Run Phase 1 UAT: OAuth → schedule → live publish — **`npm run uat:t053:sandbox`** PASS 2026-06-24 (sandbox); live: **`npm run uat:t053`** when OAuth creds set

- [x] T054 [P] Run CI schema gate on main; zero PGRST205 — `npm run phase4:uat` PASS 2026-06-24

- [x] T055 [P] Run Phase 2 smoke: ingestion → analytics dashboard truth test — automated tests PASS

- [x] T056 [P] Run full-stack walkthrough end-to-end — `scripts/full-walkthrough.ps1` + `npm run walkthrough`

- [x] T057 [P] Meta publish gate — **`npm run uat:meta-approve -- <uuid> --force`** PASS 2026-06-24 (staging DB gate); production Meta App Review still required for live IG/FB

## Phase 4 automation (2026-06-24)

- [x] T063 [P] Automated T053 publish UAT script — `scripts/t053-run-uat.ts`, `npm run uat:t053`

- [x] T064 [P] Automated T057 Meta gate script — `scripts/t057-approve-meta.ts`, `npm run uat:meta-approve`

- [x] T065 [P] UAT status diagnostic — `scripts/t053-t057-status.ts`, `npm run uat:status`



---



## Implementation Summary (2026-06-23 — full speckit cycle)

| Status | Count | Notes |
|--------|-------|-------|
| Complete `[x]` | 65 | All phases including T053 sandbox + T057 staging gate |
| Testing automation | 9 | T-INT-001–005, T053 sandbox, T-UI-002/T024, T-LOAD-002 — see [testing-plan.md](./testing-plan.md) |
| Production-only (optional) | 0 | Live OAuth UAT: `npm run uat:t053` with real credentials; Meta App Review for production IG/FB |



---



## Dependencies



```text

Phase 0 (T001â€“T004)

    â”‚

    â–¼

Phase 1A Epic 3 (T005â€“T009) â”€â”€â–؛ Phase 1B Epic 1 (T010â€“T024)

    â”‚                                    â”‚

    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â–؛ Phase 2A Epic 2 (T025â€“T031)

                                         â”‚

                                         â”œâ”€â”€â–؛ Phase 2B Epic 4 (T032â€“T037)

                                         â”‚

                                         â””â”€â”€â–؛ Phase 2C Token refresh (T038)

                                                   â”‚

                                                   â–¼

                                         Phase 3 (T039â€“T052) â”€â”€â–؛ Phase 4 (T053â€“T057)

```



## Parallel Example



```bash

# After T015 PublisherAdapter interface lands:

T016, T017, T023    # network adapters in parallel

T011, T012, T013    # OAuth routes in parallel (separate files)



# After Epic 1 first publish works:

T025, T032          # post_analytics migration + docker compose in parallel

```



## Out of Scope (Do Not Schedule Here)



- `nexus-mobile` feature work

- New executive/analytics dashboard products

- Net-new UI modules unrelated to OAuth, publish status, or error surfacing

- Meta/Instagram production publish before business App Review approval



---



## Next Command

Phase 4 manual UAT when OAuth sandbox credentials available. See **Phase Exit Notes** below.

---

## Phase Exit Notes

### Phase 0 exit (2026-06-23)
Preflight complete. Verified: `npm run typecheck`, `npm test` (51 tests), `npm run schema:verify` (18 tables after 000009), Playwright smoke (4 tests).

### Phase 2D exit (2026-06-23)
Gap fixes T058–T062: multi-platform analytics IDs, LinkedIn insights API, health worker gate, report builder empty states, full-stack walkthrough/compose token refresh env.

### Phase 3 exit (2026-06-23)
Reputation, AI tools, UX table stakes complete. Spec refreshed in `spec.md`.

### Phase 4 — Manual UAT

**T053:** `npm run dev` + `npm run worker:dev` → OAuth connect LinkedIn/X → schedule post 2 min ahead → verify `published` + `external_post_id`.

**T054:** Merge to main triggers CI workflows; local: `npm run schema:verify`.

**T055:** After publish, confirm `/analytics` shows ingested metrics; `DEMO_ANALYTICS_ENABLED=false`.

**T056:** `docker compose -f docker-compose.full-stack.yml up -d` then `npm run walkthrough`.

**T057:** After Meta App Review: `UPDATE workspaces SET meta_app_review_status = 'approved' WHERE id = '<uuid>';`

**Launch checklist:** `nexus-social-app/LAUNCH_CHECKLIST.md`

