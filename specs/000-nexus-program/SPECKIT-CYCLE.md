# Nexus Program — Speckit Cycle (2026-07-10)

**Workspace:** `nexus-social-app`  
**GitHub:** `waleedhewalla78-sudo/NEXUS` @ `main`  
**Prod:** `https://nexussocial.tech`  
**Constitution:** **v1.5.1**  
**Verdict:** **CONDITIONAL PRODUCTION** — 006 eng done; 007 Phase 0; human gates open

---

## `/speckit.constitution` — v1.5.1 principles (summary)

| Area | Non-negotiable |
|------|----------------|
| **SoR / SoI** | Reconciler-only SoR writes; agents never write DB directly |
| **Dify** | Runtime/RAG only — not orchestrator |
| **Orchestration** | Inngest + Redis; 202+poll for long work |
| **RLS** | Every tenant table before API |
| **AI approval** | Risk tier + policy — never confidence alone |
| **CL-030** | No campaign-workflow / reconciler validation rewrites |
| **CL-048** | One Diligent AI motion |
| **CL-053** | ≥55% margin or stop scale |
| **CL-055** | No 007 eng before paying pilot / first-release progress |
| **CL-056** | 3 flagship skills only |

Full text: [`nexus-social-app/CONSTITUTION.md`](../../nexus-social-app/CONSTITUTION.md)

---

## `/speckit.specify` — Built vs want

### Built ✅

| Area | Status |
|------|--------|
| 003 OAuth/publish/worker/Chatwoot | ✅ |
| 004 9-agent mesh, policy, FinOps, memory | ✅ |
| 005 ABM/CRM/MENA/control plane | ✅ S18–19 |
| 006 Concierge Shadow→AI-Active, escalation, margin gate | ✅ eng 0–3 |
| Enterprise skin + intelligence feed | ✅ |
| QA: health + 23 e2e + k6 | ✅ local |

### Want (remaining)

| ID | Requirement | Owner |
|----|-------------|-------|
| FR-OPS-006 | Apply `cost_to_serve_snapshots` + Dify publish | Ops |
| FR-OPS-006b | 006 Shadow UAT + client AI-Active sign-off | Ops/Client |
| FR-B1–B4 | Meta, OAuth UAT, exec sign-off, secrets | Human |
| FR-007-0 | Strategy Audit paid offer | Commercial |
| FR-007-1 | Skill Registry eng | Eng after CL-055 |
| FR-S20 | Agency Sprint 20 | 🔒 A-GATE-003 |

---

## Command execution (this cycle)

| Command | Status | Output |
|---------|--------|--------|
| constitution | ✅ | v1.5.1 |
| specify | ✅ | 007 `spec.md` + program built/want |
| clarify | ✅ | CL-055–057 |
| analyze | ✅ | 007 analysis + program status |
| plan | ✅ | 007 `plan.md` |
| tasks | ✅ | 007 `tasks.md` |
| taskstoissues | ✅ | GitHub #36–#39 |
| implement | ✅ | Phase 0 commercial pack (no eng) |
| converge | ✅ | T009 human; T010+ gated CL-055 |

---

## Explicit skips (approved)

- Hermes VPS deploy (founder skip)  
- Feature 007 eng T010+ (CL-055)  
- 33-module Marketing OS rebuild (CL-056)  
