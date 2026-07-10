# Feature 007 — Skill Registry

**Created:** 2026-07-10 (`/speckit.specify`)  
**Product:** Nexus Social / Diligent AI  
**Status:** Phase 0 (commercial) — engineering gated by CL-055

---

## 1. Problem

Nexus already owns governance, agent mesh, reconciler, FinOps, and attribution. What is missing is a **versioned craft layer**: ICP, brand voice, GEO, and strategy audits that agents can load at runtime without becoming a 33-module greenfield rebuild.

## 2. Solution

A **Skill Registry (L6.5)** between agents and reconciler: SKILL.md packs that existing agents (Brain, Creator, Concierge) load. Ship **3 flagships** only (CL-056):

1. **Brand Voice + Humanizer** — dialect-aware voice for Creator + Concierge  
2. **Strategy Audit** — paid DFY land offer; seeds ICP/voice artifacts  
3. **Arabic GEO** — AI-citation measurement under Policy Engine V2  

## 3. Functional requirements

| ID | Requirement | Priority | Phase |
|----|-------------|----------|-------|
| FR-100 | Operators can sell Strategy Audit as a manual DFY offer (no platform code) | P0 | 0 |
| FR-101 | System MUST store versioned skills with workspace scope + RLS | P0 | 1 |
| FR-102 | System MUST run skills via Inngest `SKILL_REQUESTED` (202+poll) | P0 | 1 |
| FR-103 | Every skill output MUST pass Policy Engine V2 before reconciler write | P0 | 1 |
| FR-104 | Skill runs MUST log FinOps cost centers (`skill.*`) | P1 | 1 |
| FR-105 | Brand Voice skill MUST feed Creator + Concierge paths | P0 | 2 |
| FR-106 | GEO skill MUST produce governed audit artifacts (async) | P1 | 3 |
| FR-107 | MCP connectors MUST reuse OAuth vault — no second CRM | P1 | 3 |

## 4. Non-goals

- 33-module Claude Marketing OS rebuild  
- Parallel product line outside Diligent AI (CL-048)  
- Eng start before paying pilot (CL-055)  
- Changing `campaign-workflow.ts` step order (CL-030)  

## 5. Success metrics

| Metric | Target |
|--------|--------|
| Phase 0 | ≥1 paid Strategy Audit pipeline (USD 15–35k band) |
| Phase 1 | Voice + Audit skills runnable in Shadow for pilot WS |
| Margin | Same ≥55% discipline as CL-053 |
