# Feature 004 Convergence Log

Documents alignment between Feature 003 (launch baseline) and Feature 004 (AI CMO OS) after Sprint 13 (`bd4fa1fe`).

## Spec boundaries

| Feature | Path | Scope |
|---------|------|--------|
| 003 | `specs/003-real-integrations-production/` | OAuth, publish, analytics, worker, launch checklist |
| 004 | `specs/004-ai-cmo-master-prd-v3/` | Hierarchy, event bus, agents, FinOps/attribution schema, orchestration |

No duplicate spec folders merged; 003 README remains pointer-only under `specs/003-real-integrations-production/`.

## Migration convergence

- **Order**: `000011` (tenants, brands, `ai_cmo_campaigns`) → `000012` (strategies, content, memory, FinOps, attribution, evaluations).
- **Combined SQL Editor bundle**: `RUN_IN_SQL_EDITOR_004_sprint12.sql` (000011 + 000012).
- **Partial apply**: If operator already ran `000011`, use `RUN_IN_SQL_EDITOR_004_000012_only.sql` only (idempotent).
- **Verify**: `npm run schema:verify` (18/18 for 003), `npm run schema:verify:004` (11/11 for 004).

## Tasks alignment

- 003 launch tasks: `LAUNCH_CHECKLIST.md` and 003 spec tasks (manual UAT, Meta review).
- 004 Sprint 12–13: schema + event bus + Strategic Brain/Creator paths (see `tasks.md`).
- Sprint 14+: Inngest approval gate (CL-002); memory repository and closed-loop metrics.

## Decisions

1. **Inngest**: deferred until dependency approval; stub documented in `src/lib/orchestration/README.md`.
2. **Dify**: runtime only; S13-T012 requires operator publish + `npm run ai:verify`.
3. **Subagent 4519f396 artifacts**: constitution/convergence/checklist paths referenced in workflow; on-disk copies maintained under this spec folder.

**Status**: `tasks_appended` — Sprint 13 code landed; schema may lag until `000012` SQL Editor apply.

**Last updated**: 2026-06-24
