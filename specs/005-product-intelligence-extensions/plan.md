# Implementation Plan: Feature 005 Product Intelligence Extensions

**Branch:** `005-product-intelligence-extensions`  
**Date:** 2026-06-27  
**Spec:** [spec.md](./spec.md)

## Summary

Phase 7 closes the **human UAT gate** (schema + gates) and ships **library + API foundations** for Campaign Brief Wizard and Paid Media Intelligence—wired into existing Quant/Finance/Sentinel architecture, not parallel artifacts.

## Technical Context

**Stack:** TypeScript 5, Next.js 16 App Router, Zod, SheetJS (`xlsx`) optional in API route, Vitest  
**Auth:** Existing `authenticateApiRequest` + workspace RLS  
**Storage:** Analytics import is **ephemeral/session** in Phase 7a (return JSON); Phase 7b persists to `ai_cmo_external_signals` or new `ai_cmo_media_imports` table  
**UI:** Phase 7b — React pages under `src/app/ai-cmo/` (Brief Wizard, Intelligence dashboard)

## Architecture

```text
L1 Dashboard (7b)     brief wizard · intelligence dashboard
L2 API                POST /campaigns (existing)
                      POST /api/v1/ai-cmo/campaigns/brief  (new, 7a)
                      POST /api/v1/ai-cmo/analytics/import (new, 7a)
L6 Agents             Quant · Finance · Sentinel consume scored insights (7b)
L7 SoR                Campaign writes via reconciler only (unchanged)
```

## Phases

### Phase 7a — Foundations (this implement pass)

| Deliverable | Path |
|-------------|------|
| Campaign brief schema + assembler | `src/lib/ai-cmo/campaign-brief/` |
| Brief → campaign API | `src/app/api/v1/ai-cmo/campaigns/brief/route.ts` |
| Column variants + platform detect | `src/lib/analytics/paid-media/column-variants.ts` |
| KPI + entity scoring | `src/lib/analytics/paid-media/kpi-calculator.ts`, `entity-scorer.ts` |
| Import parse API | `src/app/api/v1/ai-cmo/analytics/import/route.ts` |
| Unit tests | `src/lib/analytics/paid-media/__tests__/` |
| UAT schema scripts | existing SQL + `uat:check-schema` |

### Phase 7b — UI + persistence (complete ✅)

- Recharts dashboard at `/ai-cmo/intelligence`
- Brief wizard at `/ai-cmo/campaigns/new`
- Calendar HTML export (download from intelligence page)
- Quant hints via `ANALYTICS_SYNCED` on import

### Phase 7c — Creative ops (optional)

- Higgsfield prompt JSON contract in Creator agent extension

## Constitution Check

| Principle | Phase 7a |
|-----------|----------|
| Reconciler-only SoR writes | ✅ Import returns JSON only |
| 003 isolation | ✅ No reconciler.ts changes |
| Risk tier > confidence | ✅ Unchanged |
| Namespace 004 | ✅ `ai-cmo/` + new `analytics/` under `src/lib/` |

**Gate:** PASS for 7a library/API scope.
