# Feature 006 — Finish Line Ops Pack

**Purpose:** Close every remaining non-eng gate so Phases 0–3 are production-ready.  
**Eng status:** COMPLETE (`15033d7` + follow-ups). Hermes: **SKIPPED** (founder).

---

## A. Database (required)

```powershell
cd nexus-social-app
# Requires DATABASE_URL in .env.local (Supabase → Project Settings → Database → URI)
npx tsx scripts/apply-006-migrations.ts
```

Expected: all six tables EXISTS + walkthrough `workspace_conversation_settings` seeded to `shadow`.

Manual fallback: paste into Supabase SQL Editor:

1. `supabase/migrations/20260720_conversation_qualification_tables.sql`
2. `supabase/migrations/20260721_cost_to_serve_snapshots.sql`

---

## B. T009 Human verification (US-082)

Record answers in [`clarifications.md`](../clarifications.md) Open verification table:

| # | Action |
|---|--------|
| V1 | Export 5–10 live Arabic Chatwoot replies; note MSA vs dialect |
| V2 | Confirm BSP (360dialog / CEQUENS / other) vs unofficial |
| V3 | Meta Business: inbound WhatsApp ≠ publish App Review (CL-051) |
| V4 | Name wedge account (default: existing ABM telecom/banking demo — CL-050) |

---

## C. A-GATE-005 Dify

1. Dify Studio → Publish app  
2. `npm run ai:verify` → exit 0  
3. If exit 2: key valid but unpublished — publish then re-run

Fallback: Concierge rules + OpenRouter still work without Dify.

---

## D. Shadow UAT then AI-Active

1. [`phase-1-uat.md`](./phase-1-uat.md)  
2. Client written sign-off  
3. [`phase-2-oversight.md`](./phase-2-oversight.md) flip + takeover drill  
4. [`phase-3-case-study.md`](./phase-3-case-study.md) AR/EN pack + margin gate

---

## E. Explicitly out of this finish (unless un-skipped)

- Hermes VPS deploy  
- PD-OPS B1 Meta App Review (social **publish** only — not inbound qualify)  
- Feature 007 Skill Registry  

---

## Done definition

| Layer | Done when |
|-------|-----------|
| Eng | Phases 0–3 code + tests on `main` |
| Data | 006 migrations applied |
| Ops | T009 filled + Dify published (or documented fallback) |
| Live | Shadow UAT pass; AI-Active only after client sign-off |
| Scale | Margin gate PASS (CL-053) |
