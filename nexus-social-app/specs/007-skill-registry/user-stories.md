# Feature 007 — User Stories

**Created:** 2026-07-10

---

## US-100 — Sell Strategy Audit (Phase 0)

**As a** Diligent AI commercial lead  
**I want** a priced Strategy Audit offer with AR/EN one-pager  
**So that** we close cash and seed ICP/voice without platform eng  

**Acceptance:** Offer pack exists; delivery is manual (Claude + existing pilot report tools); artifacts stored in shared drive / CRM note.

**Status:** Phase 0

---

## US-101 — Register a skill

**As an** ops engineer  
**I want** to register a versioned SKILL.md for a workspace  
**So that** agents load a governed craft pack  

**Acceptance:** `skills` row via reconciler; RLS; version immutable after publish.

**Status:** Phase 1 (gated CL-055)

---

## US-102 — Run a skill async

**As an** operator  
**I want** to request a skill run and poll status  
**So that** long audits do not block HTTP  

**Acceptance:** `SKILL_REQUESTED` Inngest; 202 + poll; policy gate before SoR write.

**Status:** Phase 1

---

## US-103 — Voice feeds Concierge + Creator

**As a** Conversation Designer  
**I want** Brand Voice skill output available to Concierge and Creator  
**So that** dialect and brand stay consistent inbound and outbound  

**Acceptance:** Shared context load; no second voice store.

**Status:** Phase 2

---

## US-104 — Arabic GEO audit

**As a** CMO  
**I want** a governed GEO citation audit for MSA/Masri/Khaleeji  
**So that** board narrative includes AI-assistant visibility  

**Acceptance:** Async job; PDF/export; Policy Engine on claims.

**Status:** Phase 3
