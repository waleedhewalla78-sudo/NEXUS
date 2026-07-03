# Section B — Production Gate Closure

**Updated:** 2026-07-03  
**Authority:** [`GATES-REMAINING.md`](./GATES-REMAINING.md) · [`UAT-SIGNOFF-RESULTS.md`](./UAT-SIGNOFF-RESULTS.md)

---

## Status summary

| Gate | Engineering | Human / operator | Overall |
|------|-------------|------------------|---------|
| **B1** Meta App Review | Guard shipped | Meta submission required | ⬜ Open |
| **B2** OAuth UAT T053–T056 | Scripts + E2E auth ready | Live platform OAuth connect | ⬜ Open |
| **B3** Executive sign-off | Automated gates signed | Leadership names | 🟡 Partial |
| **B4** Prod secrets | Template + checklist ready | Vault population | ⬜ Open |
| **B5** Staging automated gates | **PASS** (local 2026-07-03) | Re-run on staging URL | 🟡 Re-verify on staging |
| **B6** E2E / k6 | **PASS** (23 E2E + k6 smoke) | Re-run on staging | 🟡 Re-verify on staging |

---

## B3 — Engineering sign-off (automated)

| Checkpoint | Status | Evidence |
|------------|--------|----------|
| Unit tests | **PASS** | 242+ tests |
| Integration tests | **PASS** | 18/18 |
| Playwright E2E | **PASS** | 23/23 |
| Live integration | **PASS** | 5/5 |
| Postman A/B | **PASS** | uat:postman-ab |
| k6 smoke | **PASS** | load-test 0% failures |
| ABM seed | **PASS** | verify:abm-seed |
| Schema UAT | **PASS** | 13/13 |

**Executive names:** fill in [`UAT-SIGNOFF-RESULTS.md`](./UAT-SIGNOFF-RESULTS.md).

---

## B4 — Production secrets checklist

Use [`.env.production.template`](../.env.production.template) and [`OPS-PROD-SECRETS-CHECKLIST.md`](./OPS-PROD-SECRETS-CHECKLIST.md).

Required before cutover:

- [ ] `${PROD_SUPABASE_*}` + `${PROD_DATABASE_URL}`
- [ ] `${PROD_REDIS_URL}` (Upstash — not localhost on VPS)
- [ ] `${PROD_INNGEST_*}` signing + event keys
- [ ] `${PROD_DIFY_*}` + `${PROD_OPENROUTER_API_KEY}`
- [ ] Security: `INTERNAL_TOOL_SECRET`, `TOKEN_ENCRYPTION_KEY`, `APPROVAL_HMAC_SECRET`, `CHATWOOT_WEBHOOK_SECRET`
- [ ] OAuth: Meta, LinkedIn, X client IDs/secrets
- [ ] HubSpot: `HUBSPOT_CLIENT_ID`, `HUBSPOT_CLIENT_SECRET`, webhook secret
- [ ] `NODE_ENV=production`, `DEMO_ANALYTICS_ENABLED=false`

---

## B1 — Meta App Review (operator)

Follow [`OPS-META-APP-REVIEW.md`](./OPS-META-APP-REVIEW.md) → set `meta_app_review_status = 'approved'`.

---

## B2 — OAuth UAT (operator)

Follow [`OPS-OAUTH-UAT-RUNBOOK.md`](./OPS-OAUTH-UAT-RUNBOOK.md):

```powershell
npm run uat:t053
# Record T053–T056 in UAT-SIGNOFF-RESULTS.md
```

Authenticated Playwright regression (optional pre-UAT):

```powershell
npx playwright install chromium
npm run test:e2e:auth
```

---

## Close-out script

```powershell
cd nexus-social-app
powershell -ExecutionPolicy Bypass -File scripts/close-section-b.ps1
```

Proceed to [`OPS-PROD-CUTOVER.md`](./OPS-PROD-CUTOVER.md) when B1–B4 are closed.
