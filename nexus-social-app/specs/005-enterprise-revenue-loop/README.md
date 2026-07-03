# Feature 005 — Enterprise Revenue Loop

**Status:** Sprint 18 in progress · Speckit cycle opened 2026-06-25  
**Baseline:** Feature 004 (AI CMO) + ABM tables wired (`20260630_enterprise_abm_tables.sql`)  
**Strategic source:** Product strategist assessment (ABM Activation → CRM Closed-Loop → Agent Control Plane → MENA Pack → Agency)

---

## Start here

| Document | Purpose |
|----------|---------|
| [spec.md](./spec.md) | Vision, FR-056–FR-075, current vs target |
| [user-stories.md](./user-stories.md) | US-021–US-030 |
| [clarifications.md](./clarifications.md) | CL-023–CL-030 |
| [analysis.md](./analysis.md) | Cross-artifact consistency + whole-project status |
| [plan.md](./plan.md) | Sprint 18–20 technical plan |
| [implementation-plan.md](./implementation-plan.md) | Phases I–M detail |
| [tasks.md](./tasks.md) | Actionable checklist (source of truth) |
| [convergence.md](./convergence.md) | Remaining work + new tasks |
| [SPECKIT-STATUS.md](./SPECKIT-STATUS.md) | Full Speckit cycle status |

---

## Verification

```powershell
npm run uat:check-schema
npm run verify:abm-seed
npm run typecheck && npm run test:unit
```
