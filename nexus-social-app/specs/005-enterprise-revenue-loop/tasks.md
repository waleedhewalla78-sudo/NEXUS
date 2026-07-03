# Tasks: Feature 005 Enterprise Revenue Loop

**Input:** [spec.md](./spec.md) · [plan.md](./plan.md) · [clarifications.md](./clarifications.md)

**Prerequisites:** ABM migration applied · `npm run seed:abm-demo` · 004 gates green

> **GitHub issues:** [issues-backlog.md](./issues-backlog.md) · Repo: waleedhewalla78-sudo/NEXUS

---

## Summary

| Status | Count | Notes |
|--------|-------|-------|
| **Pre-complete (ABM wiring)** | 3 | US-026–028 |
| **Sprint 18** | **12/12 ✅** | Phase I complete |
| **Sprint 19** | **10/10 ✅** | Phase II–III complete |
| **Sprint 20 Blocked** | 0/4 | A-GATE-003 |

**Last updated:** 2026-07-02

---

## Pre-complete (ABM foundation)

- [x] P005-T000 [US-026] ABM live API
- [x] P005-T001 [US-027] Explainability from DB topics
- [x] P005-T002 [US-028] Seed script

---

## Sprint 18 — Phase I: Activation + Control Plane ✅

- [x] P005-S18-T001 Migration `abm_playbook_runs` + RLS
- [x] P005-S18-T002 Reconciler schema
- [x] P005-S18-T003 `activate-playbook.ts`
- [x] P005-S18-T004 POST activate API
- [x] P005-S18-T005 UI activate button
- [x] P005-S18-T006 Rate limit
- [x] P005-S18-T007 Control plane API
- [x] P005-S18-T008 Control plane UI
- [x] P005-S18-T009 Unit tests
- [x] P005-S18-T010 check-uat-schema
- [x] P005-S18-T011 Gate — `typecheck && test:unit && verify:abm-seed`
- [x] P005-S18-T012 verify-abm-seed activation smoke
- [x] P005-S18-T013 Wire live ABM page

---

## Sprint 19 — Phase II–III: CRM + MENA ✅

- [x] P005-S19-T001 HubSpot webhook + HMAC
- [x] P005-S19-T002 `scripts/sync-hubspot-deals.ts` · `npm run sync:hubspot-deals`
- [x] P005-S19-T003 Domain link CRM → intent scores in attribution calc
- [x] P005-S19-T004 Executive export CRM closed-won totals
- [x] P005-S19-T005 HubSpot OAuth stub (settings UI)
- [x] P005-S19-T006 Salesforce webhook adapter
- [x] P005-S19-T007 `compliance-profiles/mena-v1.ts`
- [x] P005-S19-T008 Compliance profile settings UI + server actions
- [x] P005-S19-T009 Compliance agent injection + audit PDF attestation
- [x] P005-S19-T010 Control plane last-audit per agent

---

## Sprint 20 — Phase IV: Agency (BLOCKED)

- [ ] P005-S20-T001 **Blocked A-GATE-003** Apply migration 000014
- [ ] P005-S20-T002 Agency client switcher nav
- [ ] P005-S20-T003 Per-client FinOps rollup dashboard
- [ ] P005-S20-T004 Client approval portal

---

## Deferred / human gates

- [ ] HG-005-001 Meta App Review (003) — operator
- [ ] HG-005-002 Live OAuth UAT (003)
- [ ] HG-005-003 Dify publish S13-T012
