# Feature 007 — Clarifications

**Date:** 2026-07-10 (`/speckit.clarify`)

---

## CL-055 — Engineering gate

**Decision:** Do **not** start Skill Registry schema, Inngest functions, or agent wiring until: (a) first-release ops progress (Dify publish and/or paying pilot path), and (b) at least one paying client or signed Strategy Audit. Phase 0 commercial (manual audit) may proceed now with **zero** platform engineering.

**Rationale:** Fit assessment — 007 is post-v1 craft layer; premature eng competes with 006 live cutover and B1–B4.

---

## CL-056 — Three flagships only

**Decision:** Adopt registry pattern + **exactly three** flagship skills for v1 of 007: Brand Voice/Humanizer, Strategy Audit, Arabic GEO. Defer remaining 30+ modules from the Claude Marketing OS proposal.

**Rationale:** Avoid 33-module backlog; embed into existing mesh rather than rebuild.

---

## CL-057 — Embed, do not rebuild

**Decision:** Skills load into existing agents (registry, ProviderRouter, Policy Engine, reconciler, cost-ledger). No parallel orchestration stack. MCP connectors reuse OAuth vault + CRM mirror.

---

## Open verification (human)

| # | Question | Owner | Status |
|---|----------|-------|--------|
| V7-1 | Named prospect for first paid Strategy Audit? | Commercial | ⬜ |
| V7-2 | Confirm pricing band USD 15–35k for MENA enterprise? | Founder | ⬜ |
| V7-3 | Paying pilot workspace ID for Phase 1 eng unlock? | Ops | ⬜ |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-07-10 | CL-055–CL-057 + verification table |
