# NEXUS PRD — Document Index

**Document ID:** NEXUS-PRD-001 · **Version:** 2.0.0 · **Date:** 2026-07-10  
**Commit:** `0eaa5d5` · **Prod:** https://nexussocial.tech · **Constitution:** v1.5.1

← **[Authoritative consolidated PRD v2.0.0](../NEXUS-PRD.md)** · [PRD Status](./PRD-STATUS.md) · [QA Results](./QA-RESULTS.md)

---

## Authority

| Priority | Source |
|----------|--------|
| 1 | [CONSTITUTION.md](../../CONSTITUTION.md) — governing principles |
| 2 | Speckit clarifications (incl. CL-048–CL-056) |
| 3 | **[`../NEXUS-PRD.md`](../NEXUS-PRD.md) v2.0.0** — authoritative product requirements (supersedes sprint prompts and PRD 1.0.1) |
| 4 | Split topic files below — navigation aids; must not diverge from consolidated PRD |

---

## Status at a glance

| Dimension | Status |
|-----------|--------|
| Verdict | **CONDITIONAL PRODUCTION** — Agency + Intelligence + Conversational eng complete; human/ops gates open; **pre-revenue** |
| Platform code (003–006 eng) | ✅ on `main` @ `0eaa5d5` |
| 007 Skill Registry | Phase 0 commercial ✅ · eng 🔒 CL-055 |
| Production ops | 🟡 Migrations + secrets + Dify publish lag |
| Commercial (S4/S6) | 🔒 Sales / payment gated |
| Tests (2026-07-10) | Health healthy · Playwright **23/23** · k6 **714/714** · 0% fail |

---

## Topic documents

| # | Topic | File |
|---|-------|------|
| 1 | Product Vision & Scope | [01-product-vision-scope.md](./01-product-vision-scope.md) |
| 2 | Problem Statement & Business Context | [02-problem-business-context.md](./02-problem-business-context.md) |
| 3 | Goals & Success Metrics | [03-goals-success-metrics.md](./03-goals-success-metrics.md) |
| 4 | User Personas & Workflows | [04-user-personas-workflows.md](./04-user-personas-workflows.md) |
| 5 | Use Cases | [05-use-cases.md](./05-use-cases.md) |
| 6 | Functional Requirements | [06-functional-requirements.md](./06-functional-requirements.md) |
| 7 | Feature Specifications | [07-feature-specifications.md](./07-feature-specifications.md) |
| 8 | Business Scenarios | [08-business-scenarios.md](./08-business-scenarios.md) |
| 9 | User Interface & Navigation | [09-ui-navigation.md](./09-ui-navigation.md) |
| 10 | Authorization, Roles & Permissions | [10-auth-roles-permissions.md](./10-auth-roles-permissions.md) |
| 11 | Reports & Dashboards | [11-reports-dashboards.md](./11-reports-dashboards.md) |
| 12 | Integration Requirements | [12-integration-requirements.md](./12-integration-requirements.md) |
| 13 | Technical Architecture | [13-technical-architecture.md](./13-technical-architecture.md) |
| 14 | Competitive Context | [14-competitive-context.md](./14-competitive-context.md) |
| 15 | Data & Privacy | [15-data-privacy.md](./15-data-privacy.md) |
| 16 | Implementation Roadmap | [16-implementation-roadmap.md](./16-implementation-roadmap.md) |
| 17 | Risks & Mitigation | [17-risks-mitigation.md](./17-risks-mitigation.md) |
| 18 | Assumptions & Constraints | [18-assumptions-constraints.md](./18-assumptions-constraints.md) |
| 19 | Appendices | [19-appendices.md](./19-appendices.md) |

---

## Operational documents

| Document | Purpose |
|----------|---------|
| [PRD-STATUS.md](./PRD-STATUS.md) | Completion tracking, gates, blockers, next actions (v2.0.0) |
| [QA-RESULTS.md](./QA-RESULTS.md) | Latest enterprise QA harness results |
| [../QA-ENTERPRISE-MASTER-PLAN.md](../QA-ENTERPRISE-MASTER-PLAN.md) | QA methodology |
| [../../specs/000-nexus-program/TEST-PLAN.md](../../specs/000-nexus-program/TEST-PLAN.md) | Full test tiers A–F |

---

## Stakeholder decisions required

| ID | Decision | Owner |
|----|----------|-------|
| STK-001 | Executive UAT sign-off (B3) | Leadership |
| STK-002 | Meta App Review timing (B1) | Product |
| STK-003 | Langfuse vs OTel-only (A-GATE-002) | Architecture |
| STK-004 | Agency migration `000014` (A-GATE-003) | Leadership |
| STK-005 | Sprint 6 unlock — Client #1 payment | Commercial |
| STK-006 | Sprint 4 unlock — signed pilot details | Commercial |
| STK-007 | Intelligence import persistence (OQ-005) | Product |
| STK-008 | Calendar export scope (OQ-006) | Product |
| STK-009 | Retention periods | Product |
| STK-010 | Confirm pricing (~$3k→$5k; Strategy Audit 15–35k) | Founder |
| STK-011 | Conversational wedge account | Founder |
| STK-012 | Shadow → AI-Active sign-off | Ops / Client |
| STK-013 | Unlock 007 eng (CL-055) | Commercial |

Full STK list and open questions: [NEXUS-PRD.md Appendix C](../NEXUS-PRD.md#appendix-c--open-questions--stk-list).

---

*Maintained with split topic files for stakeholder navigation. **Authoritative requirements live in [`../NEXUS-PRD.md`](../NEXUS-PRD.md) v2.0.0.** Update PRD-STATUS after each release gate.*
