# Dify Publish Runbook

**Gate:** A-GATE-005 / HG-005-003  
**Script:** `npm run ai:verify`

---

## Prerequisites

- Dify Cloud account (or self-hosted Dify with public API URL)
- App created in Dify Studio with published workflow
- `${PROD_DIFY_API_KEY}` from **Publish → API Access**

---

## Checklist

- [ ] **1.** Log into Dify → open Nexus AI CMO app
- [ ] **2.** Click **Publish** (top-right) — confirm version is live
- [ ] **3.** Copy **API Key** → set `${PROD_DIFY_API_KEY}` in production env
- [ ] **4.** Copy **App ID** → set `${PROD_DIFY_APP_ID}` (if used by provisioning)
- [ ] **5.** Set `${PROD_DIFY_BASE_URL}` (default `https://api.dify.ai`)
- [ ] **6.** Run verification:

```powershell
cd nexus-social-app
# Load prod env or export DIFY_* vars
npm run ai:verify
```

Expected: HTTP 200 from Dify chat/completion endpoint; no circuit-breaker open.

- [ ] **7.** Trigger test campaign via Postman Test A or `/api/ai-cmo/campaigns` — confirm `result.status=published`
- [ ] **8.** Record in [`UAT-SIGNOFF-RESULTS.md`](./UAT-SIGNOFF-RESULTS.md)

---

## Fallback

If Dify unavailable, OpenRouter fallback activates when `${PROD_OPENROUTER_API_KEY}` is set (see circuit breaker in `src/lib/ai-cmo/dify-client.ts`).

---

## References

- [`HUMAN-UAT-PLAYBOOK.md`](./HUMAN-UAT-PLAYBOOK.md) Phase 3
- [`OPERATOR-GATES.md`](./OPERATOR-GATES.md)
