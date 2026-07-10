# Feature 007 — Technical Plan

**Created:** 2026-07-10 (`/speckit.plan`)  
**Stack:** Next.js 16 · Supabase · Redis · Inngest · Policy Engine V2 · ProviderRouter · existing agent mesh

---

## 1. Architecture (additive L6.5)

| Layer | Existing | 007 addition |
|-------|----------|--------------|
| L4 Governance | Policy Engine V2 | Skill outputs must pass policy |
| L5 Memory | PG + Qdrant | Skill artifacts as learnings/context |
| L6 Agents | 9 agents (incl. Concierge) | Load skill packs at run |
| **L6.5 Skills** | — | **NEW** registry + skill_runs |
| L7 Reconciler | SoR writes | Additive `skills` / `skill_runs` schemas |
| L8 FinOps | cost-ledger + cost-to-serve | `cost_center: skill.*` |

**CL-030:** Do not change campaign-workflow step order or reconciler core validation.

---

## 2. Phase 0 (ungated — commercial)

1. Strategy Audit offer one-pager EN + AR  
2. Delivery checklist (manual Claude + `generate:pilot-report`)  
3. Speckit track (this folder)  
4. Constitution CL-055/056  

**No migrations. No Inngest. No agent code.**

---

## 3. Phase 1+ (gated — CL-055)

1. Migration `skills`, `skill_versions`, `skill_runs` + RLS  
2. Inngest `SKILL_REQUESTED`  
3. Flagship skills: `brand_voice`, `strategy_audit` (platform-assisted)  
4. Wire Voice into Creator + Concierge context load  
5. Later: GEO async + MCP verify  

---

## 4. Tech decisions

| Topic | Choice |
|-------|--------|
| Skill format | SKILL.md + JSON schema metadata |
| Runtime | Inngest 202+poll (mirror conversation inbound) |
| Storage | Reconciler-only SoR |
| Scope | 3 flagships (CL-056) |

---

## 5. Risks

| Risk | Mitigation |
|------|------------|
| Eng before cash | CL-055 hard gate |
| Scope creep to 33 modules | CL-056 |
| Duplicate CRM | Reuse HubSpot/SFDC mirror |
