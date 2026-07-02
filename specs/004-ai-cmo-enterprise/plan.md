# Implementation Plan: Feature 004 AI CMO Enterprise

**Branch:** `004-ai-cmo-enterprise` | **Date:** 2026-06-25 | **Spec:** [spec.md](./spec.md)

**Input:** V1.0 architecture complete; post-launch Sprints 15–17 for mesh expansion, Qdrant, security.

## Summary

Feature 004 extends Nexus Social (003) with an autonomous AI CMO layer: Inngest orchestration, 8-agent mesh, governance, FinOps, and closed-loop optimization. **V1.0 (Phases 0–8) is code-complete.** Post-launch work fleshes out 5 skeleton agents, production Qdrant, Knowledge Hub expansion, enterprise IdP, and security validation.

## Technical Context

**Language/Version:** TypeScript 5.x, Node 20+, Next.js App Router  
**Primary Dependencies:** Inngest, Langfuse, Supabase, Redis (ioredis), Dify API, OpenRouter, Vitest  
**Storage:** Supabase Postgres (SoR), Redis (jobs/events/rate limits), Qdrant (optional SoI)  
**Testing:** Vitest unit tests; Playwright E2E (S17); manual UAT Postman  
**Target Platform:** Vercel (API) + long-running worker (`src/bin/worker.ts`)  
**Performance Goals:** Agent p95 < 30s; API campaign POST < 500ms (202 response)  
**Constraints:** Never modify `reconciler.ts`; additive migrations only; PII scrub fail-safe  
**Scale/Scope:** V1.0 single-tenant demo → 5k workspaces (S16+ sharding)

## Constitution Check

| Principle | V1.0 | Post-Launch |
|-----------|------|-------------|
| SoR/SoI — reconciler-only writes | ✅ Enforced | Must hold for all new agents |
| Risk tier > confidence | ✅ Policy Engine V2 | Channel Risk advisory only |
| 003 isolation | ✅ Bridge read-only | No change |
| PII fail-safe | ✅ secure-reconciler-writer | Extend to new ingest sources |
| Dify runtime, Inngest orchestrator | ✅ | Unchanged |

**Gate:** PASS for V1.0 go-live. Re-check after each post-launch epic.

## Architecture Phases

### Phase A — V1.0 (Complete)

| Phase | Deliverable | Key paths |
|-------|-------------|-----------|
| 0–2 | Foundation + memory schema | `supabase/migrations/000012`, `memory-repository.ts` |
| 3 | Governance + FinOps | `policy-engine-v2.ts`, `budget-guard.ts`, `cost-middleware.ts` |
| 4 | Quality + resilience | `quality-evaluator.ts`, `circuit-breaker.ts` |
| 5 | Agency + OCC | `000014`, `securePatchSoR` |
| 6 | ProviderRouter + replan | `provider-router.ts`, `event-replan-workflow.ts` |
| 7 | Agent mesh skeletons | `agents/*.ts`, `registry.ts` |
| 8 | PII + production spec | `pii-scrubber.ts`, handoff docs |
| P1 | INT-01/02 integration | `redis-to-inngest.ts`, Optimizer LLM |

### Phase B — Sprint 15 (External Intel + Vector)

- Radar production (H5)
- Channel Risk API (M6)
- Qdrant full implementation (C6, L3)
- VectorStore abstraction
- Brain ← Radar memory hook

### Phase C — Sprint 16 (Mesh + Knowledge + Ops UI)

- Finance, Quant, Sentinel production (M5, M7, M8)
- Compliance legal packs (H11)
- Knowledge Hub expansion (M3)
- AI Ops dashboard (H10)
- Portfolio S&OP (M4) — optional
- Redis stream sharding spike (M13)

### Phase D — Sprint 17 (Productization + Security) — Complete

- Hierarchy UI, approval inbox, Playwright smoke, pentest docs, SAML/NextAuth, SRE runbook, Inngest DLQ

### Phase E — V2.0 Local Bootstrap (Complete)

| Deliverable | Path |
|-------------|------|
| Master env template | `.env.full-stack.example` |
| Idempotent setup script | `scripts/Invoke-FullStackSetup.ps1` |
| Stack verification | `scripts/verify-v2-stack.ts` |
| Runbook | `docs/FULL-STACK-LOCAL-SETUP.md` |
| Infra compose | `docker-compose.v2-local.yml` (Redis + Qdrant) |

**npm scripts:** `bootstrap:local`, `verify:v2-stack`, `infra:v2`

### Phase F — Wiring Hardening (Pending)

See [tasks.md Phase 6](./tasks.md): Sentinel/Quant Inngest consumers, Knowledge Hub registry, compliance agent alignment.

## Project Structure

```text
specs/004-ai-cmo-enterprise/     # Speckit feature (this directory)
nexus-social-app/
├── src/lib/ai-cmo/              # L5–L6 agents, memory, quality
├── src/lib/orchestration/       # L3 Inngest + bridge
├── src/lib/governance/          # L4 policy, PII, residency
├── src/lib/finops/              # L8 cost tracking
├── src/bin/worker.ts            # 003 + 004 background loops
├── docs/004-*.md                # Ops runbooks + backlog
└── supabase/migrations/         # ai_cmo_* schema
```

**Structure Decision:** Monorepo with `nexus-social-app` as deployable; Feature 004 is additive under `src/lib/ai-cmo/` and `src/lib/orchestration/`.

## Tech Stack Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Orchestration | Inngest | Durable steps, retries, cron; already wired |
| LLM routing | ProviderRouter | Dify → OpenRouter; circuit breakers |
| Memory primary | Postgres | RLS, reconciler path; Qdrant augments |
| Vector (post-launch) | Qdrant + embedding API | Hybrid search at scale |
| Tracing | Langfuse + OTel | AI ops SLOs |
| Auth V1.0 | Workspace API key | UAT simplicity |
| Auth post-launch | SAML/SCIM | Enterprise POST-B |

## Complexity Tracking

No constitution violations requiring justification. Skeleton agents defer domain logic intentionally (CL-004-001).

## References

- [clarifications.md](./clarifications.md)
- [tasks.md](./tasks.md)
- [nexus-social-app/docs/004-PRODUCTION-READINESS.md](../../nexus-social-app/docs/004-PRODUCTION-READINESS.md)
- [Gap matrix](../nexus-social-app/specs/004-ai-cmo-master-prd-v3/architecture-audit/02-gap-analysis-matrix.md)
