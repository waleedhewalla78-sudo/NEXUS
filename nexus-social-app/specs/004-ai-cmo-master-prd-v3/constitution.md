# Feature 004 Constitution

Governance for AI CMO OS (`specs/004-ai-cmo-master-prd-v3`). Project-wide rules live in [`CONSTITUTION.md`](../../CONSTITUTION.md) and [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md) (v1.2.0); this file records Feature 004 scope and non-negotiables.

## Core Principles (Feature 004)

### I. SoR / SoI — reconciler-only writes

AI agents and Dify workflows MUST NOT mutate Supabase SoR tables directly. Campaign and content persistence goes through `src/lib/sync/reconciler.ts` and `campaign-service.ts`.

### II. Multi-tenant RLS

All `ai_cmo_*`, `brands`, and `tenants` access is workspace-scoped via RLS and `is_workspace_member`. New tables ship with member policies before any API surface.

### III. Zero regression on Feature 003

OAuth, publish adapters, webhooks, and worker publish loops remain the 003 baseline. Feature 004 is additive migrations (`000011` then `000012`) and new modules under `src/lib/ai-cmo/` and orchestration.

### IV. Test gates

Mark Sprint tasks `[x]` only after:

```powershell
npm run typecheck && npm test && npm run schema:verify && npm run schema:verify:004 && npm run build
```

### V. Orchestration vs Dify

Dify = agent runtime (RAG, generation). Workflow state = `src/lib/orchestration/` (Inngest when approved). Event bus = Redis Streams via `marketing-event-bus.ts`.

## MENA / compliance

Policy engine gates high-risk content classes before publish; locale-aware output (`en-US`, `ar-SA`) required for MENA tenants.

## Migrations

| Step | Artifact |
|------|----------|
| Hierarchy | `20260624_000011_ai_cmo_hierarchy.sql` |
| Foundation | `20260624_000012_ai_cmo_foundation.sql` or `RUN_IN_SQL_EDITOR_004_000012_only.sql` if 000011 already applied |

After apply: `NOTIFY pgrst, 'reload schema';` then `npm run schema:verify:004` (11/11).

## Governance

Feature constitution defers to project constitution on conflict. Amendments bump this file’s version line and note in `convergence.md`.

**Version**: 1.0.0 | **Ratified**: 2026-06-24 | **Last Amended**: 2026-06-24
