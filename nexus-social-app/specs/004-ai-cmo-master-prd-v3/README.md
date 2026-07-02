# Feature 004 — AI CMO Master PRD v3.0

**Status:** Sprint 12–13 complete · Sprint 14 partial · Phases F–H not started  
**Last speckit.specify:** 2026-06-24

Autonomous AI Marketing Engine / AI CMO for agencies & enterprises (MENA + global), built on [Feature 003 — Real Integrations](../003-real-integrations-production/spec.md).

---

## Start here

| Document | Purpose |
|----------|---------|
| **[spec.md](./spec.md)** | Product vision, current vs target state, FR-001–FR-055, NFR-001–NFR-012, traceability, out of scope |
| **[user-stories.md](./user-stories.md)** | US-001–US-020 with acceptance scenarios and persona index |
| **[tasks.md](./tasks.md)** | Sprint 12–17 task checklist |
| **[plan.md](./plan.md)** | Sprint dependency graph |
| **[implementation-plan.md](./implementation-plan.md)** | Phases A–H technical plan |
| **[IMPLEMENT_PLAN_ALL_OPEN.md](./IMPLEMENT_PLAN_ALL_OPEN.md)** | Master open-work tracker (~82 items) |

---

## Architecture audit pack

Principal AI Architect review (2026-06-23). Read [architecture-audit/README.md](./architecture-audit/README.md) before major implementation.

| Doc | Topic |
|-----|-------|
| [01-executive-audit](./architecture-audit/01-executive-audit.md) | Issue register |
| [02-gap-analysis-matrix](./architecture-audit/02-gap-analysis-matrix.md) | Gap → sprint mapping |
| [03-refactored-architecture](./architecture-audit/03-refactored-architecture.md) | 9-layer target |
| [04-orchestration-strategy](./architecture-audit/04-orchestration-strategy.md) | Inngest selection |
| [05–16](./architecture-audit/README.md) | Memory, policy, FinOps, DR, roadmap, production readiness |

---

## Governance & alignment

| Document | Purpose |
|----------|---------|
| [constitution.md](./constitution.md) | Feature 004 governance rules |
| [convergence.md](./convergence.md) | 003/004 alignment (no publish regression) |
| [clarifications.md](./clarifications.md) | CL-001 through CL-007 |
| [analysis.md](./analysis.md) | Post-migration gap register |
| [data-model.md](./data-model.md) | Entity reference |
| [research.md](./research.md) | Technical research notes |

---

## Checklists

| Checklist | When |
|-----------|------|
| [checklists/sprint13.md](./checklists/sprint13.md) | Sprint 13 closeout |
| [checklists/sprint13-launch.md](./checklists/sprint13-launch.md) | Sprint 13 launch gate |
| [checklists/launch-readiness.md](./checklists/launch-readiness.md) | Pre-launch |

---

## Verification commands

```powershell
npm run schema:verify      # 003 — 18/18
npm run schema:verify:004  # 004 — 11/11
npm test                   # 107 tests (2026-06-24)
npm run typecheck
npm run build
npm run ai:verify          # after Dify publish (S13-T012)
```

---

## Requirement snapshot (2026-06-24)

| Metric | Count |
|--------|-------|
| Functional requirements (FR) | 55 |
| Non-functional requirements (NFR) | 12 |
| User stories (US) | 20 |
| FR with any implementation | ~22 (~40%) |
| FR fully complete | ~12 (~22%) |
| Module A–W runtime (audit) | ~35% |
| Automated tests | 107 passed |

---

## Related features

- **Feature 003:** [../003-real-integrations-production/](../003-real-integrations-production/) — OAuth, publish worker, analytics (baseline; link don't duplicate)
- **Project constitution:** [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md)
- **Launch checklist:** [`LAUNCH_CHECKLIST.md`](../../LAUNCH_CHECKLIST.md)
