# NEXUS PRD — Document Index

**Document ID:** NEXUS-PRD-001 · **Version:** 1.0.0 · **Date:** 2026-07-04  
**Commit:** `befc0c3` · **Prod:** https://nexussocial.tech

← [Full consolidated PRD](../NEXUS-PRD.md) · [PRD Status](./PRD-STATUS.md) · [QA Results](./QA-RESULTS.md)

---

## Status at a glance

| Dimension | Status |
|-----------|--------|
| Platform code (003–007) | ✅ Code-complete on `main` |
| Production ops | 🟡 Migrations + secrets lag |
| Commercial (S4/S6) | 🔒 Sales / payment gated |
| QA harness | 🟡 **13 PASS · 3 FAIL · 1 WARN · 2 SKIP** (2026-07-04) |

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
| [PRD-STATUS.md](./PRD-STATUS.md) | Completion tracking, gates, blockers, next actions |
| [QA-RESULTS.md](./QA-RESULTS.md) | Latest enterprise QA harness results |
| [../QA-ENTERPRISE-MASTER-PLAN.md](../QA-ENTERPRISE-MASTER-PLAN.md) | QA methodology |
| [../../specs/000-nexus-program/TEST-PLAN.md](../../specs/000-nexus-program/TEST-PLAN.md) | Full test tiers A–F |

---

## Authority & conflict resolution

1. [CONSTITUTION.md](../../CONSTITUTION.md) — governing principles  
2. [clarifications.md](../../specs/000-nexus-program/clarifications.md) — recorded decisions  
3. This PRD set — product specification  
4. Sprint prompts — historical; superseded by PRD where divergent

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

---

*Maintained with split topic files for stakeholder navigation. Update PRD-STATUS and QA-RESULTS after each release gate.*
