# Feature 005 — Product Intelligence Extensions

**Status:** `/speckit.specify` — Phase 7 add-on to Feature 004  
**Date:** 2026-06-27  
**Parent:** `specs/004-ai-cmo-enterprise/` (58/58 complete; UAT gate open)  
**Constitution:** `nexus-social-app/CONSTITUTION.md` — reconciler-only writes; 003 isolation

---

## Problem

Feature 004 delivers autonomous AI CMO orchestration but lacks:

1. **Executive-friendly campaign intake** (non-technical brief → structured objective)
2. **Paid media audit UI** (CSV import → scored entities → reallocation recommendations; XLSX deferred P2)
3. **Planning exports** (30-day calendar HTML from persisted campaigns — future)
4. **Creative video prompt tooling** (Higgsfield-style — future, off-core)

Four external React artifact blueprints were evaluated; only **integrated extensions** add moat vs. commodity standalone tools.

---

## User Stories

| ID | Story | Priority | Artifact source |
|----|-------|----------|-----------------|
| US-012 | As a CMO, I fill a brief wizard and trigger an AI CMO campaign with a structured objective | P1 | Prompt Genius |
| US-013 | As a media buyer, I upload Meta/Google export and see ROAS/CPA scoring with Scale/Optimize/Pause labels | P1 | Campaign Intelligence |
| US-014 | As an agency, I export a 30-day content calendar HTML from workspace campaigns | P2 | Content Calendar |
| US-015 | As a creative lead, I generate Higgsfield-safe video/still prompts from Arabic or English ideas | P3 | Higgsfield engineer |

---

## Functional Requirements

### FR-050 — Campaign Brief Wizard (US-012)

- Form fields: role, seniority, domain, context, core + secondary objectives, target role, experience, market, artifact type
- Output: single structured objective string consumed by `POST /api/v1/ai-cmo/campaigns`
- Locale passthrough for compliance (default `en-US` for UAT)

### FR-051 — Paid Media Analytics Import (US-013)

> **V1.0 scope:** CSV import only. XLSX parsing deferred to P2 backlog (T077+) to avoid heavy Node dependencies.

- Accept **CSV** upload (workspace-scoped, API key auth)
- Auto-detect platform (Meta, Google, TikTok, Snapchat)
- Map canonical fields via `COLUMN_VARIANTS`
- Compute KPIs: spend, ROAS, CPA, CTR, CVR, frequency
- Score entities 0–100 vs account medians; classify Scale / Optimize / Test More / Pause
- Emit `QuantInsightProposal`-compatible summary for Brain memory (read-only ingest; no direct SoR campaign writes from upload)

### FR-052 — UAT Schema Closure (gate)

- `ai_cmo_evaluations.auto_rejected` and related columns applied in Supabase
- `npm run uat:check-schema` → OK
- Live integration + Postman A/B PASS

---

## Non-Goals (Phase 7)

- Standalone Claude artifacts without workspace/auth
- Full Recharts dashboard UI (Phase 7b)
- Higgsfield API integration
- Replacing Quant/Sentinel Inngest agents — **extend**, don't duplicate

---

## Success Criteria

| Gate | Metric |
|------|--------|
| UAT | Live integration 5/5 PASS |
| US-012 | Brief → 202 campaign API with valid objective |
| US-013 | Import API returns platform, mapping, scored entities (unit-tested math) |
| Constitution | Zero agent direct Supabase writes; analytics ingest read-only |
