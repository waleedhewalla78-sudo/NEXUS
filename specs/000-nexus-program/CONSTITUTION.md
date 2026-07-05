# Nexus Program Constitution (Speckit Canonical Summary)

**Version:** 1.4.2 · **Ratified:** 2026-06-23 · **Amended:** 2026-07-05  
**Full text:** [`nexus-social-app/CONSTITUTION.md`](../../nexus-social-app/CONSTITUTION.md)  
**PRD:** [`docs/NEXUS-PRD.md`](../../nexus-social-app/docs/NEXUS-PRD.md)

---

## Governing principles (non-negotiable)

1. **SoR / SoI** — Reconciler-only Postgres writes; intelligence via `ingest-raw.ts` (CL-039).
2. **Risk tier > confidence** — CRITICAL/HIGH never auto-publishes on LLM score alone.
3. **CL-030** — Do not modify `campaign-workflow.ts` step order or `reconciler.ts` validation.
4. **Dify = runtime, Inngest = orchestrator** — Not the reverse.
5. **202 + poll** — Long AI work never blocks HTTP.
6. **RLS on every tenant table** — Workspace isolation before APIs.
7. **Agency-led GTM** — No self-serve pilot UI; high-touch onboarding (CL-033/034).
8. **Payment gate** — No Pit Crew `/admin` before Client #1 paid (CL-036).
9. **Intelligence funnel** — CSV + webhooks only; no native GA4/Meta sync workers (CL-038).
10. **Enterprise UX** — SaaS UI off → `/` redirects to `/intelligence` (CL-041).
11. **Secrets never in repo** — `.env.example` documents keys only.

---

## Feature tracks

| Track | Status |
|-------|--------|
| 003 Real integrations | Production baseline |
| 004 AI CMO mesh | Shipped |
| 005 Revenue / ABM / CRM | Shipped |
| Sprint 2–3 GTM | Shipped |
| Sprint 5 pilot report | Shipped |
| Sprint 7 Intelligence | Shipped + prod DB applied |
| Sprint 4 provision | Sales gate |
| Sprint 6 Pit Crew | Payment gate |

---

## Testing gates

```powershell
npm run typecheck
npm run test:unit          # 257+ pass
npm run qa:enterprise:report   # target 0 FAIL
```

`test:unit` harness flake under load → **WARN** (CL-042), not FAIL.

---

## What we do NOT do

- Build S4/S6 before commercial unlock
- Apply migration `000014` without A-GATE-003
- Native GA4/Meta/WhatsApp background sync workers
- Modify reconciler/campaign workflow (CL-030)

**Full decision log:** [`clarifications.md`](./clarifications.md) · [`SPECKIT-CYCLE.md`](./SPECKIT-CYCLE.md)
