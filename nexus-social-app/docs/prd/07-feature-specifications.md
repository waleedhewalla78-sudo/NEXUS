# 7. Feature Specifications

← [PRD Index](./README.md) · [06 Functional Requirements](./06-functional-requirements.md)

---

## Feature index

| Feature | Priority | Introduced | Status | Dependencies |
|---------|----------|------------|--------|--------------|
| Omnichannel publish | Must-have | 003 | ✅ Shipped | OAuth, worker, Redis |
| AI CMO mesh | Must-have | 004 | ✅ Shipped | Inngest, Dify/OpenRouter |
| Policy + approvals | Must-have | 004 | ✅ Shipped | Policy engine |
| FinOps ledger | Must-have | 004 | ✅ Shipped | cost_ledger |
| ABM dashboard | Must-have | 005 | ✅ Shipped | intent scores |
| CRM attribution | Must-have | 005 | ✅ Shipped | Webhooks |
| Enterprise landing | Must-have | Sprint 2 | ✅ Code | Flags, migration |
| Enterprise leads | Must-have | Sprint 2 | ✅ Code | `enterprise_leads` |
| LinkedIn OAuth | Must-have | Sprint 3 | ✅ Code | Prod secrets |
| Meta Lead Ads | Must-have | Sprint 3 | ✅ Code | HMAC secret |
| HubSpot OAuth | Should-have | Section B | ✅ Shipped | Dev app |
| Intelligence feed | Must-have | Sprint 7 | ✅ Code | Migration `20260715` |
| Briefing agent | Must-have | Sprint 7 | ✅ Shipped | OpenRouter optional |
| Pilot report CLI | Must-have | Sprint 5 | ✅ Shipped | ABM seed |
| Playwright auth E2E | Should-have | QA | ✅ Shipped | Demo user |
| Pit Crew admin | Must-have | Sprint 6 | 🔒 Blocked | Payment |
| Provision pilot CLI | Must-have | Sprint 4 | 🔒 Blocked | Signed client |
| Meta FB/IG publish | Must-have | 003 | ⬜ Gated | B1 |
| TikTok/Snap publish | Nice-to-have | FR-P01 | ❌ Deferred | — |
| Intelligence PDF | Nice-to-have | S7-P2 | ❌ Backlog | — |
| Sprint 20 agency | Should-have | 004 | 🔒 Blocked | A-GATE-003 |

---

## F-001 — Intelligence Feed

| Attribute | Value |
|-----------|-------|
| **Purpose** | Unified timeline of ingests + AI briefs |
| **Benefit** | Board-ready narrative without BI setup |
| **Acceptance** | CSV upload → ingest → brief → copy; date filters; badges; empty state |
| **Version** | Sprint 7 (`ebd6222`) |

## F-002 — Enterprise landing

| Attribute | Value |
|-----------|-------|
| **Purpose** | Public Diligent AI GTM page |
| **Benefit** | Value prop in &lt;60 seconds |
| **Acceptance** | Hero + problem/solution grids + form → 201; no app chrome |
| **Version** | Sprint 2 (`3e795f2`) |

## F-003 — generate:pilot-report

| Attribute | Value |
|-----------|-------|
| **Purpose** | 30-day back-dated ROI simulation |
| **Benefit** | Client PDF without manual SQL |
| **Acceptance** | Summary: $150k pipeline default, $12.50 AI cost, margin % |
| **Version** | Sprint 5 (`e38d6f6`) |
| **Note** | Run on VPS host, not Docker app container |

## F-004 — HubSpot OAuth

| Attribute | Value |
|-----------|-------|
| **Purpose** | Workspace-scoped CRM token |
| **Benefit** | Closed-won sync without static PAT |
| **Acceptance** | Connect/disconnect UI; `sync:hubspot-deals` resolves OAuth token |
| **Version** | Section B closure |

## F-005 — Pit Crew Console (PLANNED)

| Attribute | Value |
|-----------|-------|
| **Purpose** | 60s client provision + margin dashboard |
| **Benefit** | Scale agency without SQL |
| **Acceptance** | POST provision API; `/admin/margins` with &lt;55% red alert |
| **Gate** | CL-036 — Client #1 payment |
