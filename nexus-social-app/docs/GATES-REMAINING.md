# Remaining Human Gates

**Updated:** 2026-07-03  
**Authority:** [CONSTITUTION.md](../CONSTITUTION.md) §8 · [NEXUS-MASTER-PRD.md](./NEXUS-MASTER-PRD.md)

Production is **code-ready for staging**; external production traffic blocked until gates below are closed.

---

## Blocking production (Section B)

| ID | Gate | Owner | Runbook | Status |
|----|------|-------|---------|--------|
| B1 | Meta App Review | Product + Meta | [`OPS-META-APP-REVIEW.md`](./OPS-META-APP-REVIEW.md) | ⬜ Open |
| B2 | Live OAuth UAT T053–T056 | QA | [`OPS-OAUTH-UAT-RUNBOOK.md`](./OPS-OAUTH-UAT-RUNBOOK.md) | ⬜ Open |
| B3 | Executive sign-off | Leadership | [`UAT-SIGNOFF-RESULTS.md`](./UAT-SIGNOFF-RESULTS.md) | ⬜ Open |
| B4 | Production secrets in vault | DevOps | [`.env.production.template`](../.env.production.template) | ⬜ Open |
| B5 | Staging automated gates | Engineering | [`OPS-STAGING-VERIFICATION.md`](./OPS-STAGING-VERIFICATION.md) | ⬜ Re-verify |
| B6 | Staging E2E / k6 | QA | [`OPS-STAGING-VERIFICATION.md`](./OPS-STAGING-VERIFICATION.md) | ⬜ Open |

---

## Architecture / leadership gates

| ID | Gate | Blocks | Status |
|----|------|--------|--------|
| A-GATE-002 | Langfuse vs OTel-only LLM traces | Full observability UI | ⬜ Open |
| A-GATE-003 | Agency hierarchy migration `000014` | **Sprint 20** (0/4 tasks) | ⬜ Open |
| A-GATE-005 | Dify workflow publish | AI campaign reliability | [`OPS-DIFY-PUBLISH.md`](./OPS-DIFY-PUBLISH.md) |

---

## Already shipped (do not re-implement)

| Item | Location |
|------|----------|
| Meta publish guard | `src/jobs/publish-due-posts.ts` |
| Schema verify scripts | `npm run schema:verify`, `schema:verify:004` |
| Publish flow E2E (mocked) | `e2e/publish-flow.spec.ts` |
| Dify circuit breaker | `src/lib/ai-cmo/dify-client.ts` |
| Qdrant client + PG fallback | `src/lib/ai-cmo/memory/` |
| TikTok/Snapchat stubs | settings integrations |

---

## Sprint 20 backlog (not production close-out)

Blocked on **A-GATE-003**:

- Migration `000014`
- Agency switcher UI
- FinOps rollup
- Client portal

Track: [`specs/005-enterprise-revenue-loop/tasks.md`](../specs/005-enterprise-revenue-loop/tasks.md) Sprint 20 section.

---

## S15–S17 scale backlog

Not in Prompt A scope — see GitHub issues #7–#19 and [`issues-backlog.md`](../specs/005-enterprise-revenue-loop/issues-backlog.md).

---

## Quick verification

```powershell
npm run verify:production:code    # local, no deploy
npm run verify:production:uat     # needs env + optional server
npm run verify:production:deploy  # needs live ${PROD_APP_URL}
```
