# Sprint 13 Checklist: AI CMO Core Value

**Purpose:** Gate Sprint 13 completion before starting Sprint 14 closed-loop work  
**Created:** 2026-06-24  
**Feature:** [spec.md](../spec.md) · [tasks.md](../tasks.md) · [convergence.md](../convergence.md)

---

## Schema & Infrastructure

- [x] CHK-S13-001 Migration 000011 applied — hierarchy tables live
- [x] CHK-S13-002 Migration 000012 applied — foundation tables live
- [x] CHK-S13-003 `npm run schema:verify` passes (18/18 Feature 003 tables)
- [x] CHK-S13-004 `npm run schema:verify:004` passes (11/11 Feature 004 tables)
- [x] CHK-S13-005 PostgREST schema cache reloaded after migrations

## Agent Runtime (Module A / L5)

- [x] CHK-S13-006 Dify client returns parsed answer; workspace key overrides env
- [x] CHK-S13-007 Strategic Brain returns structured plan JSON (horizon + channels)
- [x] CHK-S13-008 Creator returns caption, hashtags, platforms from plan
- [ ] CHK-S13-009 Dify Strategic Brain app published in Dify Studio (S13-T012)
- [ ] CHK-S13-010 Dify Creator app published in Dify Studio (S13-T012)
- [x] CHK-S13-011 OpenRouter fallback active when Dify unavailable

## Governance & Explainability (Modules C, S, U)

- [x] CHK-S13-012 Policy engine blocks on risk classification (not confidence alone)
- [x] CHK-S13-013 Calibrated confidence API returns score, band, explainability
- [x] CHK-S13-014 Executive/operator/compliance personas render distinct shapes
- [x] CHK-S13-015 Content quality gate enforces publish threshold

## SoR/SoI & Orchestration (Modules P, Q, A)

- [x] CHK-S13-016 Campaign writes go through reconciler only (no direct agent writes)
- [x] CHK-S13-017 Content pieces persisted via `campaign-service.ts`
- [x] CHK-S13-018 `runCampaignWorkflow` completes with policy + quality gates
- [x] CHK-S13-019 Event consumers invoke replan callback for matching event types
- [x] CHK-S13-020 Inngest blocker documented in `src/lib/orchestration/README.md`

## API & Tests

- [x] CHK-S13-021 `POST /api/v1/ai-cmo/campaigns` returns status + explainability
- [x] CHK-S13-022 `GET /api/v1/ai-cmo/campaigns` lists campaigns
- [x] CHK-S13-023 `POST /api/v1/ai-cmo/confidence` returns calibrated output
- [x] CHK-S13-024 All Sprint 13 unit tests pass (94 total)
- [x] CHK-S13-025 Feature 003 test suite unchanged (zero regression)

## Regression (Feature 003)

- [x] CHK-S13-026 OAuth handlers untouched
- [x] CHK-S13-027 Publish worker untouched
- [x] CHK-S13-028 Webhook handlers untouched

---

## Notes

- Sprint 13 code complete; operator action remains: publish Dify apps + `npm run ai:verify`
- Next: Sprint 14 — Inngest approval, memory repo, Optimizer agent
