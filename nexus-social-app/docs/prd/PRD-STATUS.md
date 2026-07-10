# NEXUS PRD — Status Tracker

**Updated:** 2026-07-10  
← [PRD Index](./README.md) · [Authoritative PRD v2.0.0](../NEXUS-PRD.md) · [QA Results](./QA-RESULTS.md)

---

## Overall verdict

| Field | Value |
|-------|-------|
| **PRD version** | **2.0.0** |
| **Codebase HEAD** | `0eaa5d5` on `main` |
| **Constitution** | v1.5.1 |
| **Product verdict** | **CONDITIONAL PRODUCTION** |
| **Engineering** | Agency + Intelligence + Conversational (006) eng complete |
| **Production verdict** | Conditional — human/ops gates open (B1–B4, A-GATE-002/003/005) |
| **Commercial verdict** | **Pre-revenue** — Sprint 4/6 gated; 007 eng gated CL-055 |

---

## Section completion matrix

| PRD section | Document | Completeness | Notes |
|-------------|----------|--------------|-------|
| 1 Vision & Scope | [01](./01-product-vision-scope.md) | ✅ 100% | Includes 006/007 in/out of scope |
| 2 Problem & Context | [02](./02-problem-business-context.md) | ✅ 100% | |
| 3 Goals & Metrics | [03](./03-goals-success-metrics.md) | 🟡 85% | G2/G4 blocked commercially |
| 4 Personas & Workflows | [04](./04-user-personas-workflows.md) | ✅ 100% | + Pit Crew, Conversation Designer |
| 5 Use Cases | [05](./05-use-cases.md) | 🟡 90% | UC-010 blocked; UC-011–013 in consolidated |
| 6 Functional Requirements | [06](./06-functional-requirements.md) | 🟡 92% | FR-PUB-03 gated on B1; 006/007 in consolidated |
| 7 Feature Specs | [07](./07-feature-specifications.md) | 🟡 88% | 007 eng gated; Pit Crew deferred |
| 8 Business Scenarios | [08](./08-business-scenarios.md) | 🟡 75% | BS-01 partial (no paid client) |
| 9 UI & Navigation | [09](./09-ui-navigation.md) | ✅ 100% | |
| 10 Auth & Roles | [10](./10-auth-roles-permissions.md) | 🟡 90% | Agency roles draft only |
| 11 Reports & Dashboards | [11](./11-reports-dashboards.md) | 🟡 85% | `/admin/margins` not built |
| 12 Integrations | [12](./12-integration-requirements.md) | 🟡 90% | Prod secrets incomplete; Dify unpublished |
| 13 Architecture | [13](./13-technical-architecture.md) | ✅ 100% | |
| 14 Competitive | [14](./14-competitive-context.md) | ✅ 100% | |
| 15 Data & Privacy | [15](./15-data-privacy.md) | 🟡 80% | STK-009 retention TBD |
| 16 Roadmap | [16](./16-implementation-roadmap.md) | 🟡 85% | S4/S6/007 eng dates TBD on commercial |
| 17 Risks | [17](./17-risks-mitigation.md) | ✅ 100% | |
| 18 Assumptions | [18](./18-assumptions-constraints.md) | ✅ 100% | CL-048–056 in consolidated |
| 19 Appendices | [19](./19-appendices.md) | ✅ 100% | |

**Authoritative body:** [`../NEXUS-PRD.md`](../NEXUS-PRD.md) v2.0.0 (all 19 sections inline).

---

## Feature track status

| Track | Code | Prod DB | Prod deploy | UAT |
|-------|------|---------|-------------|-----|
| 003 Real integrations | ✅ | ✅ | 🟡 | B2 open |
| 004 AI CMO mesh (T001–T058) | ✅ | ✅ | 🟡 | Partial |
| 005 ABM/CRM/MENA S18–19 | ✅ | ✅ | 🟡 | Partial |
| Sprint 20 agency | 🔒 | — | — | A-GATE-003 |
| Sprint 2 Enterprise skin | ✅ | 🟡 | 🟡 | C1–C3 |
| Sprint 3 GTM OAuth | ✅ | ✅ | 🟡 secrets | C5–C6 |
| Sprint 4 Provision CLI | ❌ | — | — | Sales gate |
| Sprint 5 Pilot report | ✅ | ✅ | 🟡 | Script ready |
| Sprint 6 Pit Crew | ❌ | — | — | Payment gate |
| Sprint 7 Intelligence | ✅ | 🟡 | 🟡 | Partial |
| **006 Conversational** | ✅ eng 0–3 | ❌ `20260721` MISSING | 🟡 | Shadow UAT open |
| **007 Skill Registry** | Phase 0 pack ✅ | — | — | Eng 🔒 CL-055 · GH #36–#39 |

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
| B6 | Staging E2E / k6 | ✅ PASS local (23 E2E · 714/714 k6 · 0% fail) |

### Architecture gates

| ID | Gate | Status |
|----|------|--------|
| A-GATE-002 | Langfuse vs OTel | ⬜ Open |
| A-GATE-003 | Agency `000014` | ⬜ Open — do not apply |
| A-GATE-005 | Dify publish | ⬜ Operator — `ai:verify` exit 2 |

### Commercial / feature gates

| ID | Gate | Unlock |
|----|------|--------|
| S4-SALES / CL-033 | Signed pilot | `provision-pilot-client.ts` |
| S6-PAY / CL-036 | Client #1 payment | Pit Crew `/admin` |
| CL-055 | Paying pilot / Strategy Audit | Feature 007 eng T010+ |
| 006 ops | Migrations + Shadow UAT | Live conversational cutover |

---

## Tests (2026-07-10)

| Check | Result |
|-------|--------|
| `/api/health` | Overall **healthy** (local: redis/worker down) |
| Playwright | **23/23** |
| k6 | **714/714** checks · **0%** fail |
| Dify `ai:verify` | **exit 2** (unpublished) |
| 006 `cost_to_serve_snapshots` | **MISSING** |

---

## P0 next actions

| # | Action | Owner | Unblocks |
|---|--------|-------|----------|
| 1 | Apply `20260720` + `20260721` (cost_to_serve_snapshots) | Operator | 006 margin ops |
| 2 | Publish Dify app → `ai:verify` exit 0 | Operator | A-GATE-005 |
| 3 | Shadow UAT → client sign-off → AI-Active | QA / Client | 006 live |
| 4 | Inject remaining prod secrets | DevOps | B4 |
| 5 | Live OAuth UAT T053–T056 | QA | B2 |
| 6 | Meta App Review (parallel) | Product | B1 |
| 7 | Executive sign-off | Leadership | B3 / STK-001 |
| 8 | Close pilot / Strategy Audit sale | Commercial | S4/S6 + CL-055 |
| 9 | **Do not** start 007 eng or apply `000014` | All | — |

---

## Speckit cycle alignment

| Track | Status |
|-------|--------|
| Constitution | ✅ v1.5.1 |
| 006 eng phases 0–3 | ✅ · Hermes SKIPPED · ops finish open |
| 007 Phase 0 | ✅ · eng gated CL-055 · issues #36–#39 |
| Clarifications | CL-048–CL-056 (CL-057 related) |

---

## Changelog

| Date | Change |
|------|--------|
| **2026-07-10** | **PRD 2.0.0** — CONDITIONAL PRODUCTION; 006/007; HEAD `0eaa5d5`; tests 23/23 + 714/714 |
| 2026-07-07 | Phase D Speckit cycle; verify:phase-d |
| 2026-07-05 | Speckit cycle refresh; production closure |
| 2026-07-04 | Sprint 7 + QA harness on `main` |
| 2026-07-03 | Sprint 5 pilot report; auth fix; GHCR pivot |

---

*Refresh this file after: migration apply, gate closure, commercial unlock, or QA re-run. Authoritative requirements: [`../NEXUS-PRD.md`](../NEXUS-PRD.md) v2.0.0.*
