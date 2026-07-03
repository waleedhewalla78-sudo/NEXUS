# Staging Verification Runbook

**Gate:** B5 / B6 — required before production cutover  
**Reference:** [`PRE-DEPLOYMENT-CHECKLIST.md`](./PRE-DEPLOYMENT-CHECKLIST.md) Section A

---

## Environment

Deploy staging with same env shape as [`.env.production.template`](../.env.production.template) but staging URLs/secrets.

```powershell
cd nexus-social-app
npm run start:staging   # docker-compose.prod.yml
```

Confirm health: `GET ${STAGING_APP_URL}/api/health`

---

## Automated gate sequence

Run from repo root with staging env loaded:

```powershell
npm run verify:production:code
npm run verify:production:uat
```

### Individual gates

| Command | Expected | Notes |
|---------|----------|-------|
| `npm run typecheck` | PASS | |
| `npm run test:unit` | 231+ pass | |
| `npm run test:integration` | 18/18 | |
| `npm run schema:verify` | 18/18 tables | |
| `npm run schema:verify:004` | 11/11 | |
| `npm run uat:check-schema` | 13/13 OK | incl. `abm_playbook_runs` |
| `npm run uat:postman-ab` | Test A + B PASS | |
| `npm run test:live-integration` | 5/5 | |
| `npm run verify:abm-seed` | PASS | needs running server + `INTERNAL_TOOL_SECRET` |
| `npm run load-test` | <5% failure | k6 health smoke on `:3005` or staging port |

---

## Playwright (optional — B6)

```powershell
npm run test:ui
# or smoke only:
npm run test:smoke
```

Existing specs: `e2e/smoke.spec.ts`, `e2e/publish-flow.spec.ts` (mocked OAuth).

---

## Sign-off

| Role | Name | Date | Staging URL |
|------|------|------|-------------|
| Engineering | | | |
| QA | | | |

Proceed to [`OPS-PROD-CUTOVER.md`](./OPS-PROD-CUTOVER.md) when all gates pass.
