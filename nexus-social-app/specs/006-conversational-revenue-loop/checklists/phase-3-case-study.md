# Feature 006 Phase 3 — AR/EN Case Study Pack (FR-092 / T021)

**Owner:** Commercial + Ops  
**Eng provides:** generators below — humans produce bilingual narrative.

---

## Inputs

- Pilot workspace ID
- Named wedge account (V4 / CL-050)
- Attribution export from `/ai-cmo/attribution`
- Margin gate report (`POST /api/v1/ai-cmo/finops/margin-gate`)
- Optional: `npm run generate:pilot-report`
- Optional: `npx tsx scripts/generate-006-audited-thread.ts`

---

## Checklist

- [ ] EN one-pager: problem → ABM activate → Concierge qualify → closed-won → margin
- [ ] AR one-pager (MSA for board; dialect quotes only if client approved)
- [ ] Screenshot: audited thread chain (ABM run → qualification → qualified_lead → CRM domain)
- [ ] Margin gate PASS/FAIL statement (CL-053) — do not claim scale if FAIL
- [ ] Store pack in shared drive + link from pilot CRM note

---

## Generator commands

```bash
# Existing 30-day campaign → CRM → attribution simulation
PILOT_WORKSPACE_ID=<uuid> npm run generate:pilot-report

# 006 conversational audited thread smoke (rules-only Concierge)
PILOT_WORKSPACE_ID=<uuid> PILOT_ACCOUNT_DOMAIN=<domain> npx tsx scripts/generate-006-audited-thread.ts

# Margin snapshot (persist)
curl -X POST http://localhost:3005/api/v1/ai-cmo/finops/margin-gate \
  -H "Content-Type: application/json" \
  -d '{"workspaceId":"<uuid>","periodMonth":"2026-07-01","mrrUsd":12000,"llmApiUsd":400,"whatsappMessageUsd":200,"bspFeeUsd":100,"pitCrewLaborUsd":2500,"infraAllocUsd":400}'
```

---

## Done when

Commercial lead signs that EN + AR packs are client-ready and margin decision is recorded.
