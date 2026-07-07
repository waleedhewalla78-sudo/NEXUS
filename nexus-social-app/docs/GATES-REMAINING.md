# Remaining Human Gates



**Updated:** 2026-07-03 (Section B closure pack)  

**Authority:** [CONSTITUTION.md](../CONSTITUTION.md) §8 · [SECTION-B-CLOSURE.md](./SECTION-B-CLOSURE.md)



Production is **code-ready for staging**; external production traffic blocked until gates below are closed.



---



## Blocking production (Section B)



| ID | Gate | Owner | Runbook | Status |

|----|------|-------|---------|--------|

| B1 | Meta App Review | Product + Meta | [`OPS-META-APP-REVIEW.md`](./OPS-META-APP-REVIEW.md) | ⬜ Open (human) |

| B2 | Live OAuth UAT T053–T056 | QA | [`OPS-OAUTH-UAT-RUNBOOK.md`](./OPS-OAUTH-UAT-RUNBOOK.md) | ⬜ Open (human) |

| B3 | Executive sign-off | Leadership | [`UAT-SIGNOFF-RESULTS.md`](./UAT-SIGNOFF-RESULTS.md) | 🟡 Engineering signed — exec pending |

| B4 | Production secrets in vault | DevOps | [`OPS-PROD-SECRETS-CHECKLIST.md`](./OPS-PROD-SECRETS-CHECKLIST.md) | ⬜ Open (human) |

| B5 | Staging automated gates | Engineering | [`OPS-STAGING-VERIFICATION.md`](./OPS-STAGING-VERIFICATION.md) | ✅ **PASS local** — re-verify on staging URL |

| B6 | Staging E2E / k6 | QA | [`OPS-STAGING-VERIFICATION.md`](./OPS-STAGING-VERIFICATION.md) | ✅ **PASS local** (23 E2E + k6) — re-verify staging |



**Automated close-out:** `powershell -File scripts/close-section-b.ps1`



---



## Architecture / leadership gates



| ID | Gate | Blocks | Status |

|----|------|--------|--------|

| A-GATE-002 | Langfuse vs OTel-only LLM traces | Full observability UI | ⬜ Open |

| A-GATE-003 | Agency hierarchy migration `000014` | **Sprint 20** (0/4 tasks) | ⬜ Open |

| A-GATE-005 | Dify workflow publish | AI campaign reliability | [`OPS-DIFY-PUBLISH.md`](./OPS-DIFY-PUBLISH.md) |



---



## Recently shipped (this closure pass)



| Item | Location |

|------|----------|

| HubSpot OAuth (#14) | `/api/oauth/hubspot/*`, settings UI |

| Playwright auth fixture | `e2e/auth.setup.ts`, `authenticated.spec.ts` |

| CI secrets doc | [`.github/SECRETS.md`](../.github/SECRETS.md) |

| Section B closure pack | `SECTION-B-CLOSURE.md`, `close-section-b.ps1` |



---



## Quick verification



```powershell

npm run verify:production:code

npm run verify:phase-d

npm run verify:phase-d:report   # on VPS with .env.production loaded

npx playwright install chromium

npm run test:e2e

npm run test:e2e:auth    # authenticated regression (needs demo user)

npm run load-test

powershell -File scripts/close-section-b.ps1

```


