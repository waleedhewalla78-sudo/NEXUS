# HubSpot Live Configuration Runbook

**Feature:** 005 Sprint 19 — inbound webhook + batch sync + OAuth  
**UI:** `/settings` → HubSpot CRM → **Connect HubSpot OAuth**

---

## OAuth path (recommended — DEC-003)

1. HubSpot Developer → **Apps** → create OAuth app
2. Redirect URL: `${PROD_APP_URL}/api/oauth/hubspot/callback`
3. Scopes: `crm.objects.deals.read`, `crm.objects.contacts.read`, `crm.schemas.deals.read`
4. Set env:

```env
HUBSPOT_CLIENT_ID=${PROD_HUBSPOT_CLIENT_ID}
HUBSPOT_CLIENT_SECRET=${PROD_HUBSPOT_CLIENT_SECRET}
HUBSPOT_OAUTH_REDIRECT_URI=${PROD_APP_URL}/api/oauth/hubspot/callback
```

5. In Nexus **Settings → HubSpot CRM**, click **Connect HubSpot OAuth**
6. Batch sync uses workspace token: `npm run sync:hubspot-deals`

---

## Private app path (alternative)

- HubSpot developer account or private app
- Production workspace UUID: `${PROD_WORKSPACE_UUID}`
- App deployed at `${PROD_APP_URL}`

---

## 1. Private app / webhook secret

1. HubSpot → **Settings → Integrations → Private Apps** (or legacy app client secret)
2. Copy **Client Secret** → `${PROD_HUBSPOT_WEBHOOK_SECRET}`
3. For batch sync, create private app token with `crm.objects.deals.read` → `${PROD_HUBSPOT_ACCESS_TOKEN}`

---

## 2. Environment variables

```env
HUBSPOT_WEBHOOK_SECRET=${PROD_HUBSPOT_WEBHOOK_SECRET}
HUBSPOT_WEBHOOK_WORKSPACE_ID=${PROD_WORKSPACE_UUID}
HUBSPOT_ACCESS_TOKEN=${PROD_HUBSPOT_PRIVATE_APP_TOKEN}
```

---

## 3. Register webhook URL

In HubSpot **Settings → Integrations → Webhooks**:

| Field | Value |
|-------|-------|
| Target URL | `${PROD_APP_URL}/api/integrations/crm/webhook/hubspot?workspaceId=${PROD_WORKSPACE_UUID}` |
| Events | `deal.creation`, `deal.propertyChange` (dealstage) |

Signature: HubSpot v1/v3 — validated in `src/lib/ai-cmo/abm/hubspot-webhook.ts`.

---

## 4. Portal ID (settings UI)

1. HubSpot → **Settings → Account Defaults** → copy **Hub ID** (portal ID)
2. In Nexus **`/settings`**, enter portal ID in HubSpot stub and save
3. Server action: `src/actions/hubspot-integration.ts`

---

## 5. Verify inbound webhook

```powershell
# With HUBSPOT_WEBHOOK_SECRET set — run unit tests
npm run test:unit -- hubspot-webhook
```

Manual: create/update deal in HubSpot → check `crm_activity_mirror` for workspace.

---

## 6. Batch sync (optional)

```powershell
npm run sync:hubspot-deals
```

Requires `${PROD_HUBSPOT_ACCESS_TOKEN}` and `${PROD_HUBSPOT_WEBHOOK_WORKSPACE_ID}`.

---

## 7. ABM dashboard

Navigate **`/ai-cmo/abm`** — CRM-linked accounts and closed-won totals from `crm_activity_mirror`.

---

## References

- [`specs/005-enterprise-revenue-loop/spec.md`](../specs/005-enterprise-revenue-loop/spec.md)
- Route: `src/app/api/integrations/crm/webhook/hubspot/route.ts`
