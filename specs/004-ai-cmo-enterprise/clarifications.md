# Feature 004 — Speckit Clarifications

**Date:** 2026-06-25  
**Scope:** V1.0 handoff + Post-launch (Sprints 15–17)  
**Resolves:** Ambiguities from gap matrix Doc 02 and master PRD v3

---

## CL-004-001 — V1.0 vs Post-Launch Boundary

**Question:** Does "100% code-complete" mean all 8 agents and Qdrant are production-ready?

**Decision:** **No.** V1.0 delivers the **closed-loop core** (Brain, Creator, Optimizer, Judge, Policy, FinOps, Inngest, bridge). Five mesh agents (Radar, Quant, Sentinel, Finance, Compliance) are **structural skeletons** with `ProviderRouter` wiring only. Qdrant runs **PG-fallback** via `qdrant-client.stub.ts`.

**Impact:** Post-launch backlog (S15–17) owns mesh expansion and vector hardening. V1.0 go-live is not blocked.

---

## CL-004-002 — Approval Queue: API vs UI

**Question:** Is US-004 (client approver inbox) required for V1.0?

**Decision:** **Backend only for V1.0.** `ai_cmo_approval_requests` + `routeToApproval()` are implemented. **UI inbox is deferred** to Sprint 17 (M11 hierarchy/productization).

**Impact:** UAT validates approval via SQL/API; operators use Inngest + poll job status until UI ships.

---

## CL-004-003 — Qdrant Requirement at Go-Live

**Question:** Must Qdrant be live before production?

**Decision:** **Optional for V1.0.** `MemoryRepository` reads Postgres learnings (`confidence >= 0.8` or `validated_by_human`). Qdrant semantic search is **S15 Critical** for scale, not a V1.0 gate.

**Impact:** Set `QDRANT_URL` post-launch; no deploy blocker if unset.

---

## CL-004-004 — Penetration Test Timing

**Question:** Is pentest a V1.0 release blocker?

**Decision:** **Post-deploy, pre-GA hardening (S17).** Execute on staging after first production deploy. Scope: `/api/inngest`, `/api/v1/ai-cmo/*`, signing key validation.

**Impact:** Story S17-004-020; not in V1.0 implement queue.

---

## CL-004-005 — External API Sources for Radar (H5)

**Question:** Must Radar integrate Twitter/Google Trends in Sprint 15?

**Decision:** **Phase 1 uses 003 `mentions` / `listening_queries`.** External trend APIs are optional enrichment in a follow-on story; do not block Radar on vendor keys.

---

## CL-004-006 — Channel Risk Agent (M6) vs Policy Engine

**Question:** Does Channel Risk replace Policy Engine V2?

**Decision:** **No.** Channel Risk is **advisory** input to `structured-policy-review`. CRITICAL tier routing remains Policy Engine V2 only (constitution: risk tier > confidence).

---

## CL-004-007 — Agent SoR Writes

**Question:** Can Finance or Optimizer write directly to Supabase?

**Decision:** **Never.** All persistence via `secureSyncToSoR` / `securePatchSoR` from orchestrator or dedicated reconciler helpers (constitution SoR/SoI boundary).

---

## CL-004-008 — Speckit Feature Directory

**Question:** Which spec directory is authoritative for Speckit?

**Decision:** `specs/004-ai-cmo-enterprise/` (this directory). Master PRD v3 (`nexus-social-app/specs/004-ai-cmo-master-prd-v3/`) remains historical FR inventory; enterprise spec is the **handoff authority**.

---

## Open Questions (Non-Blocking)

| ID | Question | Owner | Target |
|----|----------|-------|--------|
| OQ-001 | Stripe vs 003 billing as Finance agent source of truth | FinOps | S16 kickoff |
| OQ-002 | Embedding model for Qdrant (OpenRouter vs Dify) | Platform | S15 spike |
| OQ-003 | Keycloak vs Supabase Enterprise SSO | Security | S17 |
