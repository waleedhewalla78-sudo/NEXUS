# Live OAuth UAT Runbook

**Gate:** B2 / HG-005-002 / T053–T056  
**Extends:** [`HUMAN-UAT-PLAYBOOK.md`](./HUMAN-UAT-PLAYBOOK.md) Phases 1–2

---

## Prerequisites

Sandbox or production OAuth apps configured. Add to `.env.local` (UAT) or production secrets:

| Variable | Platform |
|----------|----------|
| `META_APP_ID`, `META_APP_SECRET` | Meta (FB/IG) |
| `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` | LinkedIn |
| `X_CLIENT_ID`, `X_CLIENT_SECRET` | X (Twitter) |
| `TOKEN_ENCRYPTION_KEY` | All (32-byte hex) |
| `NEXT_PUBLIC_APP_URL` | Must match OAuth redirect host |

Redirect URIs must match `${NEXT_PUBLIC_APP_URL}/api/oauth/{platform}/callback`.

---

## Phase 1 — Connection

- [ ] Start app: `npm run dev` (local) or confirm staging URL live
- [ ] Navigate to **`/settings`** (Integrations hub — not `/settings/integrations`)
- [ ] **Meta:** Click Connect OAuth → complete consent → return to settings → status **OAuth connected**
- [ ] **LinkedIn:** Repeat
- [ ] **X:** Repeat
- [ ] Verify DB: `workspace_social_connections` rows for workspace with `disconnected_at IS NULL`

---

## Phase 2 — Publish (sandbox)

- [ ] Create draft at **`/posts/create`**
- [ ] Schedule for +2 minutes on connected platform (LinkedIn/X if Meta not approved)
- [ ] Start worker: `npm run worker:dev` (local) or confirm prod worker running
- [ ] Confirm post status → `published` in **`/calendar`**
- [ ] Confirm analytics row appears (may take sync interval)

---

## Automated UAT scripts

```powershell
npm run uat:t053
# Sandbox mock Graph (optional):
npm run uat:t053:sandbox
```

> **Note:** `uat:t054` does not exist in `package.json`. Use `npm run uat:postman-ab` for campaign API gates.

---

## Record results

Update [`UAT-SIGNOFF-RESULTS.md`](./UAT-SIGNOFF-RESULTS.md) — Human UAT table (T053–T056).

| Test ID | Description | Pass/Fail | Tested By | Date |
|---------|-------------|-----------|-----------|------|
| T053 | OAuth connect all platforms | | | |
| T055 | Analytics truth after publish | | | |
| T056 | Full-stack walkthrough | | | |
