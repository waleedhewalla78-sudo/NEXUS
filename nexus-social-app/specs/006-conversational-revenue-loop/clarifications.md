# Feature 006 — Clarifications

**Date:** 2026-07-09 (`/speckit.clarify`)  
**Method:** Resolved from Integration Assessment §1/§7, Strategic Proposal, Launch Plan, and current PRD-STATUS — no interactive Q&A required for Phase 0.

---

## CL-048 — One GTM motion

**Decision:** Absorb conversational capability into **Diligent AI enterprise DFY**. Do **not** launch a parallel mid-market WhatsApp SDR product line.

**Rationale:** Integration Assessment §7 — two motions split the company; capability merge is clean.

---

## CL-049 — Pit Crew surface = Chatwoot

**Decision:** Escalation and human takeover use the **existing Chatwoot inbox**. No new Pit Crew console UI in 006. Sprint 6 `/admin` remains payment-gated (CL-036) and is separate.

---

## CL-050 — Wedge account default

**Decision:** Prefer **existing enterprise ABM demo traction** (telecom/banking Scenario A) for the first end-to-end conversational demo. Real-estate mid-market remains a valid later vertical, not the first 006 wedge unless Founder overrides in writing.

---

## CL-051 — Meta gate independence

**Decision:** Conversational WhatsApp **inbound** via Chatwoot/BSP is **not** blocked by `meta_app_review_status` (which gates FB/IG **publish**). Operators must still confirm BSP/Chatwoot channel is live. Publish App Review (B1) remains required for social publish, not for inbound qualify.

---

## CL-052 — Sequencing gate

**Decision:** Do **not** start Concierge agent implementation (FR-083+) until: (a) staging/prod app healthy for a committed pilot workspace, and (b) that pilot agrees to a conversational WhatsApp pilot. Phase 0 (profile + cost model + verification) may proceed now.

---

## CL-053 — Margin gate

**Decision:** Gross margin per client = MRR − (LLM + WhatsApp messages + BSP fee + allocated Pit Crew labor + infra). **Target ≥ 55%**. FAIL → stop scale; re-engineer delivery. Matches Strategic Proposal / Launch Plan S11.

---

## CL-054 — Dialect vs MSA profiles

**Decision:** `mena_v1` remains **MSA formal** for published content. `mena_conversational_v1` allows dialect register for replies while retaining CRITICAL PDPL / regulated-claim / cross-border blocks. Both run through Policy Engine V2.

---

## Open verification (human — US-082)

| # | Question | Owner | Status | Recorded answer |
|---|----------|-------|--------|-----------------|
| V1 | Sample of current live Arabic inbox replies (MSA vs dialect)? | Ops | 🟡 Pending sample export | Use Chatwoot export; dialect allowed under `mena_conversational_v1` |
| V2 | WhatsApp transport = verified BSP (360dialog/CEQUENS) or unofficial? | Ops | 🟡 Confirm on live BSP | Inbound qualify not blocked by Meta publish review (CL-051) |
| V3 | Confirm Meta inbound vs publish permission split on live Meta Business | Product | 🟡 Confirm in Meta Business | Publish App Review = B1 only |
| V4 | Named wedge account for conversational pilot | Founder | ✅ Default set (CL-050) | **Existing enterprise ABM demo (telecom/banking Scenario A)** — override in writing if needed |

**Finish pack:** [`checklists/finish-line-ops.md`](./checklists/finish-line-ops.md)

---

## Changelog

| Date | Change |
|------|--------|
| 2026-07-09 | CL-048–CL-054 + verification table |
| 2026-07-09 | V4 defaulted to CL-050 ABM wedge; finish-line ops pack linked |
