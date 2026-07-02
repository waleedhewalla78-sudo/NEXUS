# Nexus Social App — Agent Guide

## Constitution (read first)

All development in this repository is governed by **[CONSTITUTION.md](./CONSTITUTION.md)** — vision, architecture, security, AI governance, workflow gates, and anti-patterns.

Speckit canonical copy: [`.specify/memory/constitution.md`](.specify/memory/constitution.md)

Feature 004 addendum: [`specs/004-ai-cmo-master-prd-v3/constitution.md`](specs/004-ai-cmo-master-prd-v3/constitution.md)

## Quick reference

| Area | Rule |
|------|------|
| **SoR writes** | Reconciler only — never from agents or Dify |
| **Dify** | Agent runtime (RAG, generation), not orchestrator |
| **Orchestration** | `src/lib/orchestration/` (Inngest pending approval) |
| **Events** | Redis Streams via `marketing-event-bus.ts` |
| **Multi-tenancy** | RLS on every tenant-scoped table; `workspaceId` / `tenantId` scope |
| **003 baseline** | OAuth, publish, worker — zero regression |
| **Task gates** | `typecheck` → `test` → `schema:verify` → `build` (+ `schema:verify:004` for 004) |
| **Source of truth** | `specs/{NNN}/tasks.md` for sprint work |

## Speckit workflow

Features live under `specs/{NNN-name}/` with `spec.md`, `plan.md`, `tasks.md`, `clarifications.md`, `convergence.md`, and `checklists/`.

Before marking tasks `[x]`:

```powershell
npm run typecheck && npm test && npm run schema:verify && npm run build
```

Feature 004 schema work also requires `npm run schema:verify:004`.

Launch readiness: [LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md) · Open work: [IMPLEMENT_PLAN_ALL_OPEN.md](./specs/004-ai-cmo-master-prd-v3/IMPLEMENT_PLAN_ALL_OPEN.md)

## Next.js

<!-- BEGIN:nextjs-agent-rules -->
This is NOT the Next.js you know. This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Code standards

- TypeScript strict — no `any` on public surfaces
- Minimal diffs — smallest correct change
- No secrets in repo — document keys in `.env.example` only
- User-facing strings via locale files
- Comments explain *why*, not *what*

## Links

- Architecture audit: [`specs/004-ai-cmo-master-prd-v3/architecture-audit/README.md`](specs/004-ai-cmo-master-prd-v3/architecture-audit/README.md)
- Notion Feature 004 hub: https://www.notion.so/3886f21f521a8111aaacf9f2414b668e
