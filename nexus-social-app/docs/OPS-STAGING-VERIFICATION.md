# Staging Verification Runbook



**Gate:** B5 / B6 — required before production cutover  

**Reference:** [`PRE-DEPLOYMENT-CHECKLIST.md`](./PRE-DEPLOYMENT-CHECKLIST.md) Section A · [`SECTION-B-CLOSURE.md`](./SECTION-B-CLOSURE.md)



---



## Environment



Deploy staging with same env shape as [`.env.production.template`](../.env.production.template) but staging URLs/secrets.



```powershell

cd nexus-social-app

npm run start:staging   # docker-compose.prod.yml

```



Confirm health: `GET ${STAGING_APP_URL}/api/health`



---



## CI / local prep (required once per machine)



```powershell

npm ci

npx playwright install chromium --with-deps   # Linux CI / first local run

```



GitHub Actions: configure secrets per [`.github/SECRETS.md`](../.github/SECRETS.md).



---



## Automated gate sequence



Run from repo root with staging env loaded:



```powershell

npm run verify:production:code

npm run verify:production:uat

powershell -ExecutionPolicy Bypass -File scripts/close-section-b.ps1

```



### Individual gates



| Command | Expected | Notes |

|---------|----------|-------|

| `npm run typecheck` | PASS | |

| `npm run test:unit` | 242+ pass | |

| `npm run test:integration` | 18/18 | |

| `npm run schema:verify` | 18/18 tables | |

| `npm run schema:verify:004` | 11/11 | |

| `npm run uat:check-schema` | 13/13 OK | incl. `abm_playbook_runs` |

| `npm run uat:postman-ab` | Test A + B PASS | |

| `npm run test:live-integration` | 5/5 | |

| `npm run verify:abm-seed` | PASS | needs running server + API key |

| `npm run load-test` | <5% failure | k6 health smoke |

| `npm run test:e2e` | 23/23 PASS | Playwright (public + API) |

| `npm run test:e2e:auth` | 4+ PASS | Authenticated UI (demo user) |



---



## Playwright (B6)



```powershell

npx playwright install chromium

npm run test:e2e

npm run test:e2e:auth

```



Specs: `e2e/smoke.spec.ts`, `e2e/publish-flow.spec.ts`, `e2e/authenticated.spec.ts`.



---



## Sign-off



| Role | Name | Date | Staging URL |

|------|------|------|-------------|

| Engineering | Automated gates | 2026-07-03 | local `:3005` |

| QA | | | |



Proceed to [`OPS-PROD-CUTOVER.md`](./OPS-PROD-CUTOVER.md) when Section B is fully closed.


