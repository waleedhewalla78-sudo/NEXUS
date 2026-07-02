# Implementation Plan: AI CMO PRD v3.0 (Sprints 12–17)

## Sprint Sequence

| Sprint | Theme | Key Deliverables |
|--------|-------|------------------|
| **12** | Foundation | Hierarchy, event bus, reconciler, orchestration skeleton, memory/finops/attribution/eval schemas, policy, quality |
| 13 | Agent Wiring | Inngest install, Dify agent mesh hooks, knowledge hub, event consumers |
| 14 | Planning Horizons | Strategic/tactical/operational planners |
| 15 | Explainability | Persona-specific outputs, decision ledger UI |
| 16 | Complete Team | Finance, Portfolio S&OP, Compliance agents |
| 17 | Production Hardening | BCP, AI Ops dashboard, launch hardening |

## Sprint 12 — Codebase Mapping

| PRD Task | New | Reuse (003) |
|----------|-----|-------------|
| Hierarchy | tenants, brands, ai_cmo_campaigns | workspaces, posts, workspace_members RLS |
| Event bus | marketing-event-bus.ts | ioredis / REDIS_URL |
| Reconciler | reconciler.ts | audit.ts, supabase/server |
| Orchestration | client + campaign-workflow stub | worker.ts pattern |
| Memory/FinOps/Attribution/Eval | SQL migrations | — |
| Policy/Quality | TS engines | — |

## Dependencies

Sprint 12 blocks Sprint 13 agent wiring. Feature 003 must remain green throughout.

See [analysis.md](./analysis.md) for dependency graph and risk register.
