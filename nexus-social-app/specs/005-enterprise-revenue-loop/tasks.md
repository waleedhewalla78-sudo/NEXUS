# Tasks: Feature 005 Enterprise Revenue Loop

**Input:** [spec.md](./spec.md) · [plan.md](./plan.md) · [clarifications.md](./clarifications.md)

**Prerequisites:** ABM migration applied · `npm run seed:abm-demo` · 004 gates green

> **GitHub issues:** Run `npm run speckit:issues-005` after `gh auth login` · Backlog: [issues-backlog.md](./issues-backlog.md)

---

## Summary

| Status | Count | Notes |
|--------|-------|-------|
| **Pre-complete (ABM wiring)** | 3 | US-026–028 |
| **Sprint 18 To Do** | 12 | Phase I |
| **Sprint 19 To Do** | 10 | Phase II–III |
| **Sprint 20 Blocked** | 4 | Phase IV |

**Last updated:** 2026-06-25

---

## Format

`[ID] [P?] [Story] Description` — paths, AC, verify command

---

## Pre-complete (ABM foundation)

- [x] P005-T000 [US-026] ABM live API — `GET /api/v1/ai-cmo/abm/accounts` · **Verify:** `npm run verify:abm-seed`
- [x] P005-T001 [US-027] Explainability from DB topics — `AbmDashboardClient.tsx` Why? button
- [x] P005-T002 [US-028] Seed script — `scripts/seed-abm-demo.ts` · `npm run seed:abm-demo`

---

## Sprint 18 — Phase I: Activation + Control Plane

- [ ] P005-S18-T001 [US-021] Migration `abm_playbook_runs` + RLS · `supabase/migrations/20260701_abm_playbook_runs.sql` · **Verify:** `uat:check-schema` · **Apply in SQL Editor**
- [x] P005-S18-T002 [P] [US-021] Reconciler schema for `abm_playbook_runs` · `reconciler.ts` · **Verify:** `npm test -- reconciler`
- [x] P005-S18-T003 [US-021] `activate-playbook.ts` — build objective, enqueue campaign, persist run · **Verify:** `npm test -- activate-playbook`
- [x] P005-S18-T004 [US-021] `POST /api/v1/ai-cmo/abm/accounts/[id]/activate` · session + API key · **Verify:** curl 202
- [x] P005-S18-T005 [US-021] Server action `activateAbmAccount` + UI button on ABM dashboard · **Verify:** manual `/ai-cmo/abm`
- [x] P005-S18-T006 [P] [US-021] Rate limit 10/hr/workspace on activation · Redis INCR
- [x] P005-S18-T007 [US-023] `control-plane-query.ts` + `GET /api/v1/ai-cmo/agents/control-plane` · **Verify:** API 200 JSON
- [x] P005-S18-T008 [US-023] `/ai-cmo/control-plane` page + nav link · **Verify:** manual UI
- [x] P005-S18-T009 [P] Unit tests — activate-playbook, control-plane-query
- [x] P005-S18-T010 [P] Update `check-uat-schema.ts` for `abm_playbook_runs`
- [ ] P005-S18-T011 Gate — `typecheck && test:unit && verify:abm-seed` · after migration apply
- [ ] P005-S18-T012 [US-021] Extend `verify-abm-seed.ts` optional activation smoke

---

## Sprint 19 — Phase II–III: CRM + MENA

- [ ] P005-S19-T001 [US-022] HubSpot webhook route + HMAC · `POST /api/integrations/crm/webhook/hubspot`
- [ ] P005-S19-T002 [US-022] `scripts/sync-hubspot-deals.ts` batch pull
- [ ] P005-S19-T003 [US-022] Domain link CRM → intent scores in attribution calc
- [ ] P005-S19-T004 [US-022] Executive export CRM closed-won totals
- [ ] P005-S19-T005 [US-029] HubSpot OAuth connection stub (settings UI)
- [ ] P005-S19-T006 [US-030] Salesforce sync adapter (mirror schema)
- [ ] P005-S19-T007 [US-024] `compliance-profiles/mena-v1.ts` rule catalog
- [ ] P005-S19-T008 [US-024] Workspace compliance profile toggle API + settings UI
- [ ] P005-S19-T009 [US-024] Compliance agent profile injection + audit PDF attestation
- [ ] P005-S19-T010 [US-023] Control plane last-audit per agent · FR-066

---

## Sprint 20 — Phase IV: Agency (BLOCKED)

- [ ] P005-S20-T001 [US-025] **Blocked A-GATE-003** Apply migration 000014
- [ ] P005-S20-T002 [US-025] Agency client switcher nav
- [ ] P005-S20-T003 [US-025] Per-client FinOps rollup dashboard
- [ ] P005-S20-T004 [US-025] Client approval portal (read-only external)

---

## Deferred / human gates

- [ ] HG-005-001 Meta App Review (003) — operator
- [ ] HG-005-002 Live OAuth UAT (003)
- [ ] HG-005-003 Dify publish S13-T012
