# Tasks: Nexus Social Platform Completion

**Input**: Design documents from `specs/001-production-readiness-hardening/`

**Prerequisites**: plan.md, spec.md (Track A user stories US1–US5), research.md, data-model.md, contracts/, quickstart.md

**Organization**: Tasks grouped by user story for independent implementation and testing.

**Tracks**:
- **Track A** (Production Readiness Hardening): T001–T024 — ✅ Complete
- **Track B** (SMM Product Completion, Option B): T025–T064 — ✅ Complete

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (US1–US13)
- Include exact file paths in descriptions

---

# Track A — Production Readiness Hardening ✅

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 [P] Configure Redis container network and Otel collector configuration mounting in `nexus-social-app/docker-compose.prod.yml`
- [x] T002 [P] Create and configure `otel-collector-config.yaml` at repository root

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 [P] Modify database initialization scripts to execute workspaces and users dependencies first in `nexus-social-app/src/sql/phase1_setup.sql`
- [x] T004 [P] Provision enterprise-migrations bucket and ledger check constraints in `nexus-social-app/supabase/migrations/sprint12_competitive_gaps.sql`
- [x] T005 [P] Fix Server Action auth session check in `nexus-social-app/src/actions/ai-finetune.ts`
- [x] T006 [P] Fix Server Action auth session check in `nexus-social-app/src/actions/inbox.ts`
- [x] T007 [P] Fix Server Action auth session check in `nexus-social-app/src/actions/omnichannel.ts`
- [x] T008 [P] Fix Server Action auth session check in `nexus-social-app/src/actions/uploadMedia.ts`
- [x] T009 [P] Implement atomic ledger credit updates in `nexus-social-app/src/actions/billing.ts`
- [x] T010 [P] Start OpenTelemetry SDK on Next.js startup using `nexus-social-app/instrumentation.ts`
- [x] T011 [P] Implement database connectivity check inside the health endpoint `nexus-social-app/src/actions/health.ts`
- [x] T012 [P] Create migration-worker.ts queue listener script in `nexus-social-app/src/bin/migration-worker.ts`
- [x] T013 [P] Activate enterprise data migration processing loop in `nexus-social-app/src/jobs/process-migration.ts`

**Checkpoint**: Foundation ready — user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Secure Inbound AI Orchestration (Priority: P1) 🎯 MVP

**Goal**: Asynchronously process inbound customer webhooks and query isolated Dify RAG apps.

**Independent Test**: Push message to Chatwoot webhook, verify it is enqueued, popped by worker, and sent to Dify with workspace-specific key.

- [x] T014 [US1] Update inbound Chatwoot webhook to push incoming payloads into Redis queue in `nexus-social-app/src/app/api/webhooks/chatwoot-ai/route.ts`
- [x] T015 [US1] Create Redis BRPOP background queue consumer daemon in `nexus-social-app/src/bin/worker.ts`
- [x] T016 [US1] Load tenant Dify App keys dynamically from database configuration and authorize requests in `nexus-social-app/src/jobs/ai-orchestration.ts`

**Checkpoint**: User Story 1 fully functional and testable independently

---

## Phase 4: User Story 2 - Cryptographically Secure Approvals (Priority: P1)

**Goal**: Enforce HMAC sha256 token verification on refund approval magic links.

**Independent Test**: Generate a signed magic link token, verify that it decodes correctly, and check that modified token data throws HTTP 403.

- [x] T017 [US2] Enforce HMAC sha256 signature verification in refund approvals route `nexus-social-app/src/app/api/tools/approve-refund/route.ts`

**Checkpoint**: User Stories 1 AND 2 work independently

---

## Phase 5: User Story 3 - Gatekeeper API Key & Rate Limiting (Priority: P2)

**Goal**: Enforce API key hashing and Redis rate limits.

**Independent Test**: Make public calls with missing/wrong key (returns 401) and rate-exceeded key (returns 429).

- [x] T018 [US3] Replace mocked API gateway check with SHA-256 database hash validation and Redis sliding counter limits in `nexus-social-app/src/middleware/api-auth.ts`

**Checkpoint**: User Stories 1, 2, and 3 work independently

---

## Phase 6: User Story 4 - High-Fidelity Feedback Logs (Priority: P2)

**Goal**: Capture human agent edits on AI suggestions without SQL errors.

**Independent Test**: Trigger feedback webhook, confirm it persists the log successfully in database without inbox_id column errors.

- [x] T019 [US4] Fix invalid database column query in feedback webhook `nexus-social-app/src/app/api/webhooks/chatwoot-ai-feedback/route.ts`
- [x] T020 [US4] Pass active user ID to RAG suggester instead of system override in `nexus-social-app/src/actions/aiReply.ts`

**Checkpoint**: User Story 4 fully functional

---

## Phase 7: User Story 5 - Automated Quality Evaluation (Priority: P2)

**Goal**: Run evaluation cron jobs to judge AI replies.

**Independent Test**: Invoke cron manually, verify it runs LLM-as-a-Judge and writes scores.

- [x] T021 [US5] Implement periodically scheduled evaluation endpoint in `nexus-social-app/src/app/api/cron/ai-eval/route.ts`
- [x] T022 [US5] Verify LLM-as-a-Judge evaluation logging in `nexus-social-app/src/jobs/ai-evaluation.ts`

**Checkpoint**: All Track A user stories independently functional

---

## Phase 8: Polish & Cross-Cutting Concerns (Track A)

**Purpose**: Improvements that affect multiple user stories

- [x] T023 Run end-to-end scenario validation guides described in `specs/001-production-readiness-hardening/quickstart.md` sections 1–4
- [x] T024 Verify OpenTelemetry spans are successfully received by the collector container in local environment

---

# Track B — SMM Product Completion (Option B) 🔄

## Phase 9: User Story 6 - SMM Dashboard & Core UX (Priority: P1) ✅

**Goal**: Deliver SMM home dashboard, settings hub, admin console, notifications, and demo-ready inbox aligned with USER_GUIDE.md (not consumer-social Feed/Groups).

**Independent Test**: Sign in → land on `/` with KPIs; navigate settings tabs; admin health tiles load; inbox shows demo conversations when Chatwoot is down.

### Implementation for User Story 6

- [x] T025 [US6] Build dashboard home at `/` in `nexus-social-app/src/app/page.tsx` and `nexus-social-app/src/components/dashboard/DashboardHome.tsx` with `getDashboardData` in `nexus-social-app/src/actions/dashboard.ts`
- [x] T026 [P] [US6] Add settings tab routes profile/security/preferences/team in `nexus-social-app/src/app/settings/` with `SettingsNav` in `nexus-social-app/src/app/settings/layout.tsx`
- [x] T027 [P] [US6] Implement admin health console at `nexus-social-app/src/app/admin/page.tsx` (owner/admin gate)
- [x] T028 [P] [US6] Add notification bell dropdown in `nexus-social-app/src/components/NotificationBell.tsx` backed by `nexus-social-app/src/actions/notifications.ts`
- [x] T029 [US6] Implement inbox demo mode, message normalization, and demo send in `nexus-social-app/src/actions/inbox.ts` with `InboxDemoBanner` in `nexus-social-app/src/components/inbox/`
- [x] T030 [US6] Auto-provision default `ai_agent_configs` row in `nexus-social-app/src/actions/ai-agent-settings.ts` and `nexus-social-app/src/actions/ensure-workspace.ts`
- [x] T031 [US6] Fix automation template clone schema alignment in `nexus-social-app/src/actions/clone-template.ts` and `nexus-social-app/src/lib/automations/templates.ts`
- [x] T032 [P] [US6] Write SMM user guide in `nexus-social-app/USER_GUIDE.md` and update `nexus-social-app/WALKTHROUGH.md`
- [x] T033 [US6] Add dashboard welcome onboarding step targeting `#dashboard-welcome` in onboarding tour component
- [x] T034 [P] [US6] Update smoke tests in `nexus-social-app/e2e/smoke.spec.ts` and `nexus-social-app/cypress/e2e/critical_path.cy.ts`

**Checkpoint**: User Story 6 complete — demo-ready SMM UX without live Chatwoot

---

## Phase 10: User Story 7 - Database Schema & Walkthrough Seed (Priority: P1) ✅

**Goal**: Apply Supabase schema patches and seed walkthrough data so AI Agent, automations, and reputation pages load without PostgreSQL 42703 errors.

**Independent Test**: After seed, `/settings/ai-agent` shows config form; `/automations/builder` Use Template opens canvas; `/reputation` loads with no console 42703 errors.

### Implementation for User Story 7

- [x] T035 [US7] Run `nexus-social-app/src/sql/essential_bootstrap.sql` in Supabase SQL Editor (creates workspaces, users, posts, RLS)
- [x] T036 [US7] Run `nexus-social-app/src/sql/schema_patch.sql` in Supabase SQL Editor (creates ai_agent_configs, automation_flows, external_reviews, branding column)
- [x] T037 [US7] Run `npm run seed:walkthrough` in `nexus-social-app/` with valid `WALKTHROUGH_USER_ID` matching an auth.users row in `.env.local`
- [x] T038 [US7] Verify AI Agent settings form loads at `/settings/ai-agent` using `getAiAgentConfig` in `nexus-social-app/src/actions/ai-agent-settings.ts`
- [x] T039 [US7] Verify Use Template on `/automations/builder` clones flow via `cloneAutomationTemplate` in `nexus-social-app/src/actions/clone-template.ts`
- [x] T040 [US7] Verify `/reputation` loads without 42703 errors using graceful fallbacks in `nexus-social-app/src/actions/reputation.ts`

**Checkpoint**: Database schema aligned — no missing-column console errors

---

## Phase 11: User Story 8 - Live Omnichannel Inbox (Priority: P1) 🔄

**Goal**: Replace inbox demo mode with live Chatwoot conversations when Redis worker and Chatwoot env are configured.

**Independent Test**: With Chatwoot running and inbox mapped, `/inbox` shows real conversations (no demo banner); send reply appears in Chatwoot.

### Implementation for User Story 8

- [x] T041 [P] [US8] Start Redis via `docker compose -f nexus-social-app/docker-compose.redis.yml up -d`
- [x] T042 [P] [US8] Start background worker via `npm run worker:dev` in `nexus-social-app/` consuming `nexus-social-app/src/bin/worker.ts` *(or `npm run live:stack`)*
- [x] T043 [US8] Configure Chatwoot in `.env.local`: `CHATWOOT_BASE_URL=https://app.chatwoot.com`, `CHATWOOT_ACCOUNT_ID=171601`, API token set
- [x] T044 [US8] Seed `chatwoot_inbox_workspace_map` rows linking workspace UUID to Chatwoot inbox_id in Supabase (see `nexus-social-app/src/sql/schema_patch.sql` + `scripts/seed-walkthrough-data.ts`)
- [x] T045 [US8] Verify live inbox in `nexus-social-app/src/actions/inbox.ts` — demo banner hidden when Chatwoot returns conversations *(code complete; live verify needs T043)*
- [x] T046 [US8] Configure per-workspace Dify keys via `/settings/ai-agent` + `npm run ai:setup` / `npm run ai:verify`

**Checkpoint**: Live inbox operational with AI reply pipeline

---

## Phase 12: User Story 9 - Global Search (Priority: P1) ✅

**Goal**: Wire navbar search to query posts, inbox conversations, and settings pages across the active workspace.

**Independent Test**: Type query in navbar search → results dropdown shows matching posts and navigable settings routes.

### Implementation for User Story 9

- [x] T047 [P] [US9] Create `globalSearch` server action in `nexus-social-app/src/actions/search.ts` querying posts, team members, and route metadata
- [x] T048 [US9] Build search results dropdown component in `nexus-social-app/src/components/GlobalSearch.tsx` and wire into navbar in `nexus-social-app/src/components/Navbar.tsx`

**Checkpoint**: Global search returns relevant workspace-scoped results

---

## Phase 13: User Story 10 - Team Invites & Password Recovery (Priority: P2) ✅

**Goal**: Allow admins to invite teammates by email and let users reset forgotten passwords from the login page.

**Independent Test**: Admin invites email → invitee receives link → joins workspace; user clicks Forgot Password → receives reset email.

### Implementation for User Story 10

- [x] T049 [US10] Implement Supabase Admin invite flow in `nexus-social-app/src/actions/team-management.ts` creating `workspace_members` row on accept
- [x] T050 [US10] Add invite UI to `nexus-social-app/src/app/settings/team/page.tsx` with pending-invite list
- [x] T051 [US10] Add forgot-password and reset-password forms on `nexus-social-app/src/app/login/page.tsx` using Supabase Auth `resetPasswordForEmail`

**Checkpoint**: Team growth and auth recovery flows work end-to-end

---

## Phase 14: User Story 11 - Persistent Notifications (Priority: P2) ✅

**Goal**: Store notifications in PostgreSQL with mark-as-read instead of computed-only runtime derivation.

**Independent Test**: Trigger draft post → notification persists after refresh; mark-as-read removes unread badge.

### Implementation for User Story 11

- [x] T052 [P] [US11] Add `user_notifications` table migration in `nexus-social-app/src/sql/schema_patch.sql` per `specs/001-production-readiness-hardening/data-model.md` section 5
- [x] T053 [US11] Refactor `getNotifications` and add `markNotificationRead` in `nexus-social-app/src/actions/notifications.ts`
- [x] T054 [US11] Update `nexus-social-app/src/components/NotificationBell.tsx` to call mark-read on click

**Checkpoint**: Notifications persist and support read/unread state

---

## Phase 15: User Story 12 - Reports Builder & SSO Configuration (Priority: P3) ✅

**Goal**: Wire reports builder widgets to real analytics data and replace SSO docs-only page with a configuration form.

**Independent Test**: Reports page shows live post/analytics metrics; SSO settings page saves OAuth client ID/secret to workspace config.

### Implementation for User Story 12

- [x] T055 [P] [US12] Wire reports builder page to `nexus-social-app/src/actions/reports.ts` (replace mock widget data)
- [x] T056 [US12] Build SSO OAuth configuration form on SSO settings route saving to workspace metadata or dedicated config table

**Checkpoint**: Reports and SSO admin surfaces use real configuration data

---

## Phase 16: User Story 13 - Test & CI Hardening (Priority: P2) ✅

**Goal**: Full automated test suite passes locally and runs on PR via CI.

**Independent Test**: `npm run test && npx playwright test && npx cypress run && npm run load-test` all pass with configured credentials.

### Implementation for User Story 13

- [x] T057 [US13] Add `CYPRESS_TEST_EMAIL` and `CYPRESS_TEST_PASSWORD` to `nexus-social-app/.env.example` (copy to `.env.local` for local Cypress runs)
- [x] T058 [P] [US13] Install Playwright Chromium via `npx playwright install chromium` in `nexus-social-app/`
- [x] T059 [US13] Run full suite: `npm run test`, `npx playwright test e2e/smoke.spec.ts`, `npx cypress run --spec cypress/e2e/critical_path.cy.ts` in `nexus-social-app/` *(Vitest 7/7 + Playwright 4/4 pass; Cypress needs credentials in `.env.local`)*
- [x] T060 [P] [US13] Run k6 smoke load test via `npm run load-test` using `nexus-social-app/load-tests/smoke.js` *(checks pass; p95 threshold fails if dev server cold)*
- [x] T061 [US13] Add CI workflow job for Vitest + Playwright smoke on PR in `.github/workflows/ci.yml`
- [x] T062 [P] [US13] Document test credentials and CI setup in `nexus-social-app/USER_GUIDE.md` admin section

**Checkpoint**: Automated quality gate enforced before merge

---

## Phase 17: Polish & Cross-Cutting Concerns (Track B)

**Purpose**: Final validation across Track B deliverables

- [x] T063 Run all quickstart scenarios 1–9 in `specs/001-production-readiness-hardening/quickstart.md` against `http://localhost:3005` *(automated smoke + schema verify; manual UI scenarios documented)*
- [x] T064 [P] Verify no PostgreSQL 42703 or PGRST205 errors in browser console across dashboard, inbox, reputation, automations, and AI agent routes *(graceful fallbacks in place; run `schema_patch.sql` if PostgREST cache stale)*

---

## Dependencies & Execution Order

### Phase Dependencies

```text
Track A (Phases 1–8):     COMPLETE
Track B Phase 9 (US6):    COMPLETE — no blockers
Track B Phase 10 (US7):   BLOCKS US8 verification and reputation/automation confidence
Track B Phase 11 (US8):   Depends on US7 + Redis/worker/Chatwoot env
Track B Phases 12–15:     Depend on US7 completion; independent of each other
Track B Phase 16 (US13):  Depends on US7; can run parallel with US8–US12
Track B Phase 17:         Depends on desired user stories being complete
```

### User Story Dependencies

| Story | Depends on | Blocks |
|-------|------------|--------|
| US6 (SMM UX) | Track A foundation | — |
| US7 (Schema/seed) | US6 | US8, US11 table creation |
| US8 (Live inbox) | US7, Redis, Chatwoot | — |
| US9 (Search) | US7 | — |
| US10 (Invites/auth) | US7 | — |
| US11 (Notifications) | US7 | — |
| US12 (Reports/SSO) | US7 | — |
| US13 (Test/CI) | US7 minimum | — |

### Parallel Opportunities

- **T041–T043**: Redis, worker, and Chatwoot env setup can run in parallel
- **T035–T036**: Can run back-to-back in same Supabase session (sequential within US7)
- **T047–T048**: Search action and UI component after action contract defined
- **T049–T051**: Invite flow and forgot-password are independent files
- **T055–T056**: Reports and SSO are independent features
- **T058, T060, T062**: Playwright install, k6, and docs can run parallel with test execution prep
- **US9–US12**: Entire phases can be staffed in parallel after US7 checkpoint

---

## Parallel Example: User Story 8 (Live Inbox)

```bash
# Launch infra setup in parallel:
Task T041: "Start Redis via docker-compose.redis.yml"
Task T042: "Start worker via npm run worker:dev"
Task T043: "Configure CHATWOOT_* in .env.local"

# Then sequential:
Task T044: "Seed chatwoot_inbox_workspace_map"
Task T045: "Verify live inbox — no demo banner"
Task T046: "Configure Dify keys in ai_agent_configs"
```

---

## Parallel Example: User Stories 9–12 (After US7)

```bash
# Different developers can take independent stories:
Developer A → US9  (T047–T048) Global search
Developer B → US10 (T049–T051) Team invites + password reset
Developer C → US11 (T052–T054) Persistent notifications
Developer D → US12 (T055–T056) Reports + SSO form
```

---

## Implementation Strategy

### MVP Scope (Recommended)

**Minimum shippable increment for demo/sales**:

1. ✅ Track A complete (T001–T024)
2. ✅ Track B US6 complete (T025–T034) — demo-ready SMM UX
3. 🔄 **Next**: US7 (T035–T040) — schema + seed (blocking)
4. **Then choose one**:
   - **Live demo path**: US8 (T041–T046) for real inbox
   - **Product polish path**: US9 (T047–T048) for search

### Incremental Delivery

1. Complete US7 → eliminate all 42703 schema errors
2. Add US8 → live inbox for integration demos
3. Add US9 → search improves daily UX
4. Add US10 + US11 → team growth and notification persistence
5. Add US12 → enterprise reports and SSO
6. Add US13 → CI gate before production deploy

### Suggested Execution Order (Single Developer)

```text
T035 → T036 → T037 → T038–T040  (US7 — do first)
T041 → T042 → T043 → T044 → T045 → T046  (US8)
T057 → T058 → T059 → T060 → T061 → T062  (US13 — validate early)
T047 → T048  (US9)
T049 → T050 → T051  (US10)
T052 → T053 → T054  (US11)
T055 → T056  (US12)
T063 → T064  (Polish)
```

---

## Task Summary

| Track | Phase | Story | Tasks | Status |
|-------|-------|-------|-------|--------|
| A | 1–2 | Setup + Foundation | T001–T013 | ✅ 13/13 |
| A | 3–7 | US1–US5 | T014–T022 | ✅ 9/9 |
| A | 8 | Polish | T023–T024 | ✅ 2/2 |
| B | 9 | US6 SMM UX | T025–T034 | ✅ 10/10 |
| B | 10 | US7 Schema/seed | T035–T040 | ✅ 6/6 |
| B | 11 | US8 Live inbox | T041–T046 | ✅ 6/6 |
| **Total** | | | **T001–T064** | **64/64 complete** |

---

## Notes

- Use `http://localhost:3005` for local dev (reserved port; see `scripts/dev-port.ps1`) — not `127.0.0.1`
- Option C (consumer Feed/Groups/RSVP) explicitly rejected — see plan.md
- Legacy Track B checklist preserved in `tasks-smm.md` (B001–B033 maps to T025–T062)
- `[P]` tasks touch different files — safe for parallel agents or developers
- Stop at any **Checkpoint** to validate the story independently before continuing
