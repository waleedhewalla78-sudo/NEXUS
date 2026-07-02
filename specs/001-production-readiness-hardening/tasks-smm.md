# Tasks: SMM Product Completion (Track B)

> **Superseded by [tasks.md](./tasks.md)** — Track B tasks are now T025–T064 in the unified task list. This file is kept as a quick reference; use `tasks.md` for `/speckit.implement`.

**Input**: [plan.md](./plan.md) Track B  
**Prerequisites**: Track A complete ([tasks.md](./tasks.md))
---

## Phase B1: Core SMM UX — COMPLETE ✅

- [x] B001 Dashboard at `/` with welcome, KPIs, quick actions, activity
- [x] B002 Settings tabs: profile, security, preferences, team
- [x] B003 Admin console `/admin` with health tiles
- [x] B004 Notification bell (computed from posts/reviews)
- [x] B005 Inbox demo mode + message normalization + demo send
- [x] B006 Auto-provision `ai_agent_configs` on workspace create / first load
- [x] B007 Fix automation template clone (schema-aligned + client fallback)
- [x] B008 USER_GUIDE.md + WALKTHROUGH.md updates
- [x] B009 Onboarding tour dashboard step (8 steps)
- [x] B010 Cypress/Playwright smoke test updates

---

## Phase B2: Database & Seed — IN PROGRESS 🔄

- [ ] B011 **USER**: Run `essential_bootstrap.sql` in Supabase SQL Editor
- [ ] B012 **USER**: Run `schema_patch.sql` in Supabase SQL Editor
- [ ] B013 Run `npm run seed:walkthrough` with valid `WALKTHROUGH_USER_ID`
- [ ] B014 Verify `/settings/ai-agent` loads config form (not empty state)
- [ ] B015 Verify `/automations/builder` Use Template opens canvas
- [ ] B016 Verify `/reputation` loads without console 42703 errors

---

## Phase B3: Live Integrations — PLANNED ⏳

- [ ] B017 Start Redis: `docker compose -f docker-compose.redis.yml up -d`
- [ ] B018 Start worker: `npm run worker:dev`
- [ ] B019 Configure Chatwoot in `.env.local`:
  - `CHATWOOT_BASE_URL`
  - `CHATWOOT_API_TOKEN`
  - `CHATWOOT_ACCOUNT_ID`
- [ ] B020 Seed `chatwoot_inbox_workspace_map` for workspace ↔ inbox_id
- [ ] B021 Verify live inbox (no demo banner) with real conversations
- [ ] B022 Configure Dify keys in `ai_agent_configs` for AI caption + reply

---

## Phase B4: Enhanced Product Features — PLANNED ⏳

- [ ] B023 Global search: posts + inbox + settings (`Navbar` → server action)
- [ ] B024 Email invite flow (Supabase Admin invite + auto workspace_members row)
- [ ] B025 Persistent notifications table + mark-as-read API
- [ ] B026 Forgot password / reset password on `/login`
- [ ] B027 Reports builder wired to real analytics data
- [ ] B028 SSO OAuth configuration form (replace docs-only page)

---

## Phase B5: Test & CI Hardening — PLANNED ⏳

- [ ] B029 Add `CYPRESS_TEST_EMAIL` / `CYPRESS_TEST_PASSWORD` to `.env.local`
- [ ] B030 Run full suite: `npm run test && npx playwright test && npx cypress run`
- [ ] B031 Run k6 smoke: `npm run load-test`
- [ ] B032 Add CI job for smoke tests on PR
- [ ] B033 Document test credentials in `USER_GUIDE.md` admin section

---

## Dependencies

```text
B011 → B012 → B013 → B014–B016
B017 → B018 → (AI webhooks)
B019 → B020 → B021
B023–B028 independent after B2 complete
B029 → B030–B032
```

---

## Parallel Opportunities

- B017–B019 (infra) can run parallel with B011–B012 (DB)
- B023–B028 feature tasks are independent after Phase B2

---

## Success Criteria

| ID | Criterion |
|----|-----------|
| SC-B1 | New user lands on dashboard with workspace auto-created |
| SC-B2 | All settings tabs save without error |
| SC-B3 | Admin health shows db:up on configured Supabase |
| SC-B4 | Inbox works in demo OR live mode (never blank error) |
| SC-B5 | E2E critical path passes with test credentials |
| SC-B6 | No PostgreSQL 42703 errors in console after schema patch |
