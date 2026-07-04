# Program Tasks — Nexus Social Platform

**Updated:** 2026-07-04 (Speckit cycle — GTM)  
**Cycle:** [`SPECKIT-CYCLE.md`](./SPECKIT-CYCLE.md)

---

## Automated engineering — DONE ✅

- [x] Feature 003 production baseline
- [x] Feature 004 AI CMO (58/58 tasks)
- [x] Feature 005 Sprint 18–19 (ABM, CRM, MENA, control plane)
- [x] Sprint 2 — `enterprise_leads`, `/enterprise`, flags, leads dashboard
- [x] Sprint 3 — Meta Lead Ads, LinkedIn OAuth hardening, `/settings/integrations`
- [x] GitHub NextAuth sign-in (navbar)
- [x] Dockerfile `--legacy-peer-deps`
- [x] Typecheck PASS (2026-07-04)

---

## Operator / Hermes (P0)

- [ ] **S3-OPS-001** Hermes: `git pull` through `60f7109`, rebuild (`docs/OPS-SPRINT-3-HERMES.md`)
- [ ] **S3-OPS-002** Prod secrets: `LINKEDIN_CLIENT_ID/SECRET`, `LINKEDIN_OAUTH_REDIRECT_URI`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, feature flags
- [ ] **S3-OPS-003** Apply `supabase/migrations/20260705_enterprise_leads.sql` on prod Supabase
- [ ] **S3-OPS-004** Verify LinkedIn Connect at https://nexussocial.tech/settings/integrations
- [ ] **S3-OPS-005** Optional: Meta Lead Ads HMAC smoke into `enterprise_leads`

---

## Human gates (Section B — still open)

- [ ] **T-D07** Live OAuth UAT T053–T056
- [ ] **T-D08** Executive names in `UAT-SIGNOFF-RESULTS.md`
- [ ] **T-D11** Meta App Review (publish only — B1)
- [ ] **T-DOC-001** Close stale GitHub issues #7–#19

---

## Sprint 4 — Land lighthouse (sales-gated)

### Phase A — Founder only (no Cursor)

- [ ] **S4-SALES-001** Pitch PDF / overview
- [ ] **S4-SALES-002** Warm outreach
- [ ] **S4-SALES-003** Demo on Zoom
- [ ] **S4-SALES-004** Written yes for $3k pilot

### Phase B — Eng (ONLY after S4-SALES-004)

- [ ] **S4-ENG-001** `scripts/provision-pilot-client.ts` + `npm run provision:pilot`
- [ ] **S4-ENG-002** Document invite + `workspace_members` owner row

### Phase C — Day-of onboard

- [ ] **S4-OPS-001** Run provision with prod service role
- [ ] **S4-OPS-002** Add CMO to workspace
- [ ] **S4-OPS-003** Magic moment: ABM activate playbook

---

## Blocked (do not start)

- [ ] Sprint 20 / Agency / `000014` — **A-GATE-003**
- [ ] Self-serve onboarding UI — **constitution OUT OF SCOPE**

---

## Verification

```powershell
cd nexus-social-app
npm run typecheck
npm run test:unit
```
