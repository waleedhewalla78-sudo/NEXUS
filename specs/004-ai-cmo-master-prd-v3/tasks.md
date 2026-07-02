# Tasks: AI CMO PRD v3.0 — Sprint 12 Foundation

**Input**: [spec.md](./spec.md), [plan.md](./plan.md), [clarifications.md](./clarifications.md)

**Prerequisites**: Feature 003 launch-ready baseline (no regression)

## Format: `[ID] Description`

---

## Sprint 12: Foundation

- [x] T001 Productization hierarchy — `20260624_000011_ai_cmo_hierarchy.sql`
- [x] T002 Event bus — `src/lib/events/marketing-event-bus.ts` (Redis Streams, typed events, idempotency)
- [x] T003 SoR/SoI reconciler — `src/lib/sync/reconciler.ts` (validate, RLS, audit, atomic write)
- [x] T004 Orchestration skeleton — `src/lib/orchestration/` (Inngest stub + campaign-workflow)
- [x] T005 Memory layer schema — `20260624_000012_ai_cmo_foundation.sql` (learnings, outcomes, strategy_history, + T006–T008)
- [x] T009 Policy engine + calibrated confidence — `policy-engine.ts`, `calibrated-confidence.ts`
- [x] T010 Content quality engine — `content-quality-engine.ts`

## Tests

- [x] T011 Unit tests — event-bus, reconciler, policy-engine, calibrated-confidence, content-quality-engine

## Verification

- [x] T012 `npm run typecheck && npm test && npm run build && npm run schema:verify`

---

## Deferred (Sprint 13+)

- [ ] T013 Install Inngest + API route
- [ ] T014 Wire reconciler to publish worker
- [ ] T015 Event consumers in worker
- [ ] T016 Materialized view refresh cron
- [ ] T017 AI CMO dashboard UI
