# Sprint 13 Launch Checklist: Feature 004 AI CMO

**Purpose**: Gate Sprint 13 launch readiness (schema, agents, APIs, regression).
**Created**: 2026-06-24
**Feature**: [spec.md](../spec.md) | Cross-ref: [LAUNCH_CHECKLIST.md](../../../LAUNCH_CHECKLIST.md)

## Schema (004)

- [ ] CHK001 `000011` hierarchy applied (tenants, brands, ai_cmo_campaigns)
- [ ] CHK002 If 000011 done only: run `supabase/migrations/RUN_IN_SQL_EDITOR_004_000012_only.sql` in SQL Editor
- [ ] CHK003 `npm run schema:verify:004` reports **11/11** tables
- [ ] CHK004 PostgREST reloaded (`NOTIFY pgrst` at end of migration script)

## Automated gates

- [ ] CHK005 `npm run typecheck` pass
- [ ] CHK006 `npm test` pass (003 + 004 unit coverage)
- [ ] CHK007 `npm run schema:verify` pass (18/18 Feature 003)
- [ ] CHK008 `npm run build` pass

## Sprint 13 deliverables

- [ ] CHK009 Strategic Brain + Creator Dify integration paths (`strategic-brain.ts`, `creator-agent.ts`)
- [ ] CHK010 Persona explainability UI (`PersonaExplainabilityPanel`, confidence API)
- [ ] CHK011 Reconciler wired for campaigns/content (`campaign-service.ts`)
- [ ] CHK012 Marketing event consumers registered (stubs acceptable for budget/underperforming)
- [ ] CHK013 APIs: `POST/GET /api/v1/ai-cmo/campaigns`, `POST /api/v1/ai-cmo/confidence`

## Operator actions

- [ ] CHK014 Publish Dify apps (S13-T012); run `npm run ai:verify`
- [ ] CHK015 Feature 003 Phase 4 UAT per LAUNCH_CHECKLIST (no 003 regression)

## Success metrics (PRD)

- [ ] CHK016 SC-001–SC-010 tracked in Notion Status Dashboard
- [ ] CHK017 FinOps/attribution tables present (000012) for Sprint 14 runtime wiring

## Notes

- Check items: `[x]` when complete.
- Partial schema (3/11) is expected until CHK002 is done.
