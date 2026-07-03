# Program Tasks — Nexus Social Platform

**Updated:** 2026-07-03 (full Speckit cycle)  
**Source of truth for open work:** this file + [`005/tasks.md`](../../nexus-social-app/specs/005-enterprise-revenue-loop/tasks.md)

---

## Automated gates — ALL PASS ✅

- [x] T-R01–T-R15 SSCADA remediation
- [x] T-D02 Schema check (13/13 UAT)
- [x] T-D04 Live integration 5/5
- [x] T-D05 Postman A
- [x] T-D06 Postman B
- [x] T067–T075 Phase 7b UI
- [x] Track 1 ops (templates, runbooks, verify:production:*, CI schema-gate)
- [x] S15-004-002 Channel risk API + liveSignals
- [x] S16-T004 LLM circuit breakers
- [x] S17-T005 Performance SLA doc
- [x] TSC `npm run typecheck` — PASS (2026-07-03)
- [x] Unit tests — **239 passed | 1 skipped** (2026-07-03)

---

## Human / business gates — cannot automate

- [ ] **T-D07** Live OAuth UAT T053–T056 — [`docs/OPS-OAUTH-UAT-RUNBOOK.md`](../../nexus-social-app/docs/OPS-OAUTH-UAT-RUNBOOK.md)
- [ ] **T-D08** Executive sign-off — [`docs/UAT-SIGNOFF-RESULTS.md`](../../nexus-social-app/docs/UAT-SIGNOFF-RESULTS.md)
- [ ] **T-D09** Production deploy + secrets — [`.env.production.template`](../../nexus-social-app/.env.production.template) · [`docs/OPS-PROD-CUTOVER.md`](../../nexus-social-app/docs/OPS-PROD-CUTOVER.md)
- [ ] **T-D10** Staging re-verify + E2E/k6 — [`docs/OPS-STAGING-VERIFICATION.md`](../../nexus-social-app/docs/OPS-STAGING-VERIFICATION.md)
- [ ] **T-D11** Meta App Review — [`docs/OPS-META-APP-REVIEW.md`](../../nexus-social-app/docs/OPS-META-APP-REVIEW.md)
- [ ] **T-D12** Dify publish S13-T012 — [`docs/OPS-DIFY-PUBLISH.md`](../../nexus-social-app/docs/OPS-DIFY-PUBLISH.md)

---

## Doc / hygiene

- [ ] **T-DOC-001** Close GitHub issues #7–#13, #15–#19 (shipped) — `scripts/close-sprint-18-19-issues.sh` (#14 stays open)
- [ ] **T-DOC-002** Commit PRD v2.1.0 when approved
- [ ] **T-DOC-003** Add Supabase GitHub Actions secrets for `schema-gate` job

---

## Blocked (A-GATE-003)

- [ ] P005-S20-T001 Migration `000014`
- [ ] P005-S20-T002 Agency switcher UI
- [ ] P005-S20-T003 FinOps rollup dashboard
- [ ] P005-S20-T004 Client portal

---

## Backlog (non-blocking)

- [ ] **T076–T078** Phase 7c (Higgsfield, XLSX, import persistence)
- [ ] **#14** HubSpot full OAuth (stub shipped)
- [ ] S15–S17 remainder (Radar live, eval UI, Playwright AI CMO E2E)

---

## Verification

```powershell
cd e:\nexus-social-platform\nexus-social-app
npm run typecheck
npm run test:unit
npm run uat:check-schema
npm run verify:abm-seed
npm run verify:production:code
```
