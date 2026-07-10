# Feature 006 — Speckit Status

**Updated:** 2026-07-09  
**Track:** [`specs/006-conversational-revenue-loop/`](./)  
**Verdict:** **ALL PHASES ENG FINISHED (0–3)** · Ops finish pack open for live cutover  
**Hermes:** Skipped (founder direction — explicit)

---

## Phase board (finish)

| Phase | Eng | Ops / live |
|-------|-----|------------|
| **0** De-risk | ✅ | — |
| **1** Concierge Shadow | ✅ | Apply migration + Shadow UAT |
| **2** Escalation + AI-Active | ✅ | Client sign-off before `ai_active` |
| **3** Close loop + Margin | ✅ | Case study fill + margin PASS for scale |

**Unit tests:** conversation + finops + T022 catalog green

---

## Finish-line artifacts

| Item | Path |
|------|------|
| Ops pack | [checklists/finish-line-ops.md](./checklists/finish-line-ops.md) |
| Oversight | [checklists/phase-2-oversight.md](./checklists/phase-2-oversight.md) |
| Case study EN/AR templates | [checklists/case-study-en-template.md](./checklists/case-study-en-template.md) · [case-study-ar-template.md](./checklists/case-study-ar-template.md) |
| Apply migrations | `npm run db:apply-006` (needs reachable `DATABASE_URL`) |
| Verify tables | `npx tsx scripts/verify-006-tables.ts` |
| Dify | `npm run ai:verify` — key valid, **workflow not published** (exit 2) |

---

## Remaining human-only (cannot auto-close)

1. **SQL Editor apply** if `db.*.supabase.co` DNS fails — paste `20260720` + `20260721`
2. **Dify Publish** in Studio (A-GATE-005)
3. **T009 V1–V3** sample/BSP/Meta confirm (V4 defaulted to CL-050 ABM wedge)
4. Shadow UAT → client sign-off → AI-Active drill
5. Fill EN/AR case study with live numbers; margin PASS before scale
6. Hermes / PD-OPS B1–B4 — out of 006 eng; Hermes skipped

**Eng finish point reached.** Live production readiness = ops pack above.
