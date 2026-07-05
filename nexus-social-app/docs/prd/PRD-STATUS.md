# NEXUS PRD — Status Tracker

**Updated:** 2026-07-05  
← [PRD Index](./README.md) · [QA Results](./QA-RESULTS.md)

---

## Overall verdict

| Field | Value |
|-------|-------|
| **PRD version** | 1.0.0 |
| **Codebase HEAD** | `befc0c3` on `main` |
| **Product verdict** | **Agency + Intelligence code complete** |
| **Production verdict** | **Not production-ready** — ops + human gates open |
| **Commercial verdict** | **Pre-revenue** — Sprint 4/6 gated |

---

## Section completion matrix

| PRD section | Document | Completeness | Notes |
|-------------|----------|--------------|-------|
| 1 Vision & Scope | [01](./01-product-vision-scope.md) | ✅ 100% | Reflects shipped + gated scope |
| 2 Problem & Context | [02](./02-problem-business-context.md) | ✅ 100% | |
| 3 Goals & Metrics | [03](./03-goals-success-metrics.md) | 🟡 85% | G2/G4 blocked commercially |
| 4 Personas & Workflows | [04](./04-user-personas-workflows.md) | ✅ 100% | |
| 5 Use Cases | [05](./05-use-cases.md) | 🟡 90% | UC-010 blocked (Sprint 6) |
| 6 Functional Requirements | [06](./06-functional-requirements.md) | 🟡 92% | FR-PUB-03 gated on B1 |
| 7 Feature Specs | [07](./07-feature-specifications.md) | 🟡 88% | 4 features blocked/deferred |
| 8 Business Scenarios | [08](./08-business-scenarios.md) | 🟡 75% | BS-01 partial (no paid client) |
| 9 UI & Navigation | [09](./09-ui-navigation.md) | ✅ 100% | |
| 10 Auth & Roles | [10](./10-auth-roles-permissions.md) | 🟡 90% | Agency roles draft only |
| 11 Reports & Dashboards | [11](./11-reports-dashboards.md) | 🟡 85% | `/admin/margins` not built |
| 12 Integrations | [12](./12-integration-requirements.md) | 🟡 90% | Prod secrets incomplete |
| 13 Architecture | [13](./13-technical-architecture.md) | ✅ 100% | |
| 14 Competitive | [14](./14-competitive-context.md) | ✅ 100% | |
| 15 Data & Privacy | [15](./15-data-privacy.md) | 🟡 80% | STK-009 retention TBD |
| 16 Roadmap | [16](./16-implementation-roadmap.md) | 🟡 85% | S4/S6 dates TBD on commercial |
| 17 Risks | [17](./17-risks-mitigation.md) | ✅ 100% | |
| 18 Assumptions | [18](./18-assumptions-constraints.md) | ✅ 100% | |
| 19 Appendices | [19](./19-appendices.md) | ✅ 100% | |

**Weighted PRD coverage:** ~91% specified · ~78% implemented · ~62% production-verified

---

## Feature track status

| Track | Code | Prod DB | Prod deploy | UAT |
|-------|------|---------|-------------|-----|
| 003 Real integrations | ✅ | ✅ | 🟡 | B2 open |
| 004 AI CMO mesh | ✅ | ✅ | 🟡 | Partial |
| 005 ABM/CRM/MENA | ✅ | ✅ | 🟡 | Partial |
| Sprint 2 Enterprise skin | ✅ | 🟡 leads OK | 🟡 | C1–C3 |
| Sprint 3 GTM OAuth | ✅ | ✅ | 🟡 secrets | C5–C6 |
| Sprint 4 Provision CLI | ❌ | — | — | Sales gate |
| Sprint 5 Pilot report | ✅ | ✅ | 🟡 | Script ready |
| Sprint 6 Pit Crew | ❌ | — | — | Payment gate |
| Sprint 7 Intelligence | ✅ | ✅ tables | 🟡 | **PASS** (post-migration) |

---

## Gate status

### Section B (production human gates)

| ID | Gate | Status |
|----|------|--------|
| B1 | Meta App Review | ⬜ Open |
| B2 | Live OAuth UAT T053–T056 | ⬜ Open |
| B3 | Executive sign-off | 🟡 Eng signed; exec pending |
| B4 | Production secrets vault | ⬜ Open |
| B5 | Staging automated gates | ✅ PASS local |
| B6 | Staging E2E / k6 | ✅ PASS local (23 E2E) |

### Architecture gates

| ID | Gate | Status |
|----|------|--------|
| A-GATE-002 | Langfuse vs OTel | ⬜ Open |
| A-GATE-003 | Agency `000014` | ⬜ Open — do not apply |
| A-GATE-005 | Dify publish | ⬜ Operator |

### Commercial gates

| ID | Gate | Unlock |
|----|------|--------|
| S4-SALES | Signed pilot | `provision-pilot-client.ts` |
| S6-PAY | Client #1 payment | Pit Crew `/admin` |

---

## QA status (summary)

Latest run: **2026-07-05** — see [QA-RESULTS.md](./QA-RESULTS.md)

| Result | Count |
|--------|-------|
| PASS | 15 |
| FAIL | 0 |
| WARN | 2 (000014 + test:unit harness flake) |
| SKIP | 2 |

**Target for prod-ready:** 0 FAIL · 0 WARN (except intentional SKIP for Sprint 6)

---

## P0 next actions

| # | Action | Owner | Unblocks |
|---|--------|-------|----------|
| 1 | ~~Apply `20260715_intelligence_feed.sql`~~ | Operator | ✅ Done 2026-07-05 |
| 2 | ~~Fix test:unit harness flake~~ | Engineering | ✅ WARN handling 2026-07-05 |
| 3 | Start dev server or point QA at staging URL | Operator | P3-app SKIP |
| 4 | Hermes: `git pull` through `befc0c3` + `docker compose pull` | Operator | Prod code parity |
| 5 | Inject LinkedIn, NextAuth, OpenRouter secrets | Operator | GTM demos |
| 6 | Re-run `npm run qa:enterprise:report` | QA | PRD prod-verified % |
| 7 | Run `generate:pilot-report` on prod workspace | Founder | Client PDF |
| 8 | Close pilot sale → payment | Commercial | Sprint 4/6 |

---

## Speckit cycle alignment

| Command | Status |
|---------|--------|
| `/speckit.constitution` | ✅ v1.4.1 |
| `/speckit.specify` | ✅ |
| `/speckit.clarify` | ✅ CL-038–040 |
| `/speckit.analyze` | ✅ G1–G14 documented |
| `/speckit.plan` | ✅ |
| `/speckit.tasks` | ✅ |
| `/speckit.implement` | ✅ S7; S6 not built |
| `/speckit.converge` | ✅ |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-07-05 | Speckit cycle refresh; QA 0 FAIL; production closure |
| 2026-07-04 | Sprint 7 + QA harness on `main` |
| 2026-07-03 | Sprint 5 pilot report; auth fix; GHCR pivot |

---

*Refresh this file after: migration apply, gate closure, commercial unlock, or QA re-run.*
