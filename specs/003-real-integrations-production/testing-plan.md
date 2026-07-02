# Implementation Plan: Testing Strategy (Feature 003)

**Linked spec:** [spec.md](./spec.md) · **Tasks:** [tasks.md](./tasks.md)  
**Notion hub:** [Feature 003 (Real Integrations)](https://app.notion.com/p/3886f21f521a81dd8afddc322d192c42)  
**Created:** 2026-06-24

## Overview

Four-layer test pyramid for launch readiness: **unit → integration → UI (E2E) → load (k6)**. Maps to FR-001–FR-040 acceptance and Phase 4 UAT (T053–T056).

## Requirements Summary

| Layer | Validates | Success criteria |
|-------|-----------|------------------|
| Unit (Vitest) | Publishers, OAuth, policy, analytics parsers, reconciler | `npm test` — 115+ tests, 0 failures |
| Integration (Vitest) | API routes + worker jobs with mocked Supabase/Redis | `npm run test:integration` green |
| UI (Playwright + Cypress) | Auth redirects, health, publish path smoke, critical flows | `npm run test:ui` smoke green in CI |
| Load (k6) | Health, webhooks, calendar under concurrent VUs | p95 < 5s smoke; staging thresholds |

## Current State (2026-06-24)

| Layer | Tool | Location | CI | Gap |
|-------|------|----------|-----|-----|
| Unit | Vitest | `src/**/__tests__`, `test/` | ✅ smoke job | — |
| Integration | Vitest | `test/integration/` | ✅ added | Expand OAuth/publish coverage |
| UI | Playwright | `e2e/` | ✅ smoke only | T024 full publish UI deferred |
| UI | Cypress | `cypress/e2e/` | ❌ manual | Wire nightly or pre-release |
| Load | k6 | `load-tests/` | ✅ workflow_dispatch | Run against staging before launch |

## Implementation Phases

### Phase T1 — Integration tests (P1)

- [x] T-INT-001 Health API route integration (`test/integration/health-api.test.ts`)
- [x] T-INT-002 Analytics tool proxy integration (`test/integration/analytics-tools.test.ts`)
- [x] T-INT-003 Publish worker pipeline integration (`test/integration/publish-worker.test.ts`)
- [x] T-INT-004 OAuth callback error paths (LinkedIn/X/Meta routes) — `test/integration/oauth-callbacks.test.ts`
- [x] T-INT-006 T053 sandbox publish acceptance (`test/integration/t053-sandbox-uat.test.ts`)

### Phase T2 — UI / E2E (P1)

- [x] T-UI-001 Playwright smoke (existing `e2e/smoke.spec.ts`)
- [x] T-UI-002 Publish pipeline API E2E (`e2e/publish-integration.spec.ts`)
- [x] T-UI-003 T024 automated publish E2E (`e2e/publish-flow.spec.ts`) — live OAuth UI remains T053
- [ ] T-UI-004 Cypress critical path in CI (optional nightly)

### Phase T3 — Load tests (P2)

- [x] T-LOAD-001 k6 smoke script (`load-tests/smoke.js`)
- [x] T-LOAD-002 GitHub Actions load-test workflow (manual dispatch)
- [ ] T-LOAD-003 Staging gate: `npm run load-test:full` before go-live
- [ ] T-LOAD-004 Calendar + AI orchestration scripts in release checklist

### Phase T4 — CI orchestration (P1)

- [x] T-CI-001 `npm run test:integration` script
- [x] T-CI-002 `npm run test:all` local gate
- [x] T-CI-003 CI smoke job runs unit + integration + Playwright smoke + publish-flow
- [ ] T-CI-004 Nightly Cypress + k6 against staging URL

## Dependencies

- Supabase migrations applied (`npm run schema:verify` 18/18)
- Dev server on `:3005` for Playwright (`NEXT_PUBLIC_APP_URL`)
- k6 installed locally (`choco install k6` or `winget install k6`)
- OAuth sandbox for T024 full UI path

## Risks & Mitigation

| Risk | Mitigation |
|------|------------|
| Flaky Playwright without auth | API-level publish E2E + integration worker tests |
| k6 fails on cold dev server | Raise p95 threshold in smoke; strict in staging workflow |
| Cypress duplicates Playwright | Cypress for legacy sprint specs; Playwright for CI smoke |
| Integration tests hit real Supabase | Mock `@/lib/supabase/server` in all integration tests |

## Success Criteria

- [x] `npm run test:all` passes locally (unit + integration + smoke UI) — 133 tests PASS 2026-06-24
- [x] CI green on PR: lint, typecheck, build, unit, integration, Playwright smoke
- [ ] k6 smoke passes against staging before production go-live
- [x] Phase 4 T053 sandbox + T057 staging gate via `npm run phase4:uat`

## Commands

```powershell
cd nexus-social-app
npm run test              # unit (Vitest)
npm run test:integration  # API + worker integration
npm run test:ui           # Playwright e2e/
npm run test:smoke        # unit + Playwright smoke
npm run uat:t053:sandbox # T053 sandbox (mock Graph API)
npm run uat:t053         # T053 live (needs OAuth creds)
npm run load-test         # k6 smoke (app must be running)
npm run load-test:full    # k6 post-creation profile
```
