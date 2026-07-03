# Salesforce Webhook Runbook

**Feature:** 005 Sprint 19 — inbound CRM mirror  
**Route:** `POST /api/integrations/crm/webhook/salesforce`

---

## Prerequisites

- Salesforce org with outbound message or Platform Event → HTTP callout capability
- Nexus deployed at `${PROD_APP_URL}`
- Workspace UUID: `${PROD_WORKSPACE_UUID}`

---

## 1. Environment variables

```env
SALESFORCE_WEBHOOK_SECRET=${PROD_SALESFORCE_WEBHOOK_SECRET}
SALESFORCE_WEBHOOK_WORKSPACE_ID=${PROD_WORKSPACE_UUID}
```

Generate secret: `openssl rand -hex 32`

---

## 2. Webhook URL

Register in Salesforce (Flow, Apex REST, or MuleSoft):

```
${PROD_APP_URL}/api/integrations/crm/webhook/salesforce?workspaceId=${PROD_WORKSPACE_UUID}
```

**Header:** `X-Salesforce-Signature: sha256=<hmac>`  
Validation: `src/lib/ai-cmo/abm/salesforce-webhook.ts`

---

## 3. Payload shape

POST JSON body with opportunity/deal fields mapped in webhook handler:

| Field | Purpose |
|-------|---------|
| `Id` | External deal ID |
| `StageName` / stage | Pipeline stage |
| `Amount` | Deal value |
| `Account` domain or website | ABM account linking |

Rows upserted to **`crm_activity_mirror`** (not `ai_cmo_deals`).

---

## 4. Verify

```powershell
npm run test:unit -- sprint19-crm-compliance
```

Manual: send test payload with valid signature → query:

```sql
SELECT * FROM crm_activity_mirror
WHERE workspace_id = '${PROD_WORKSPACE_UUID}'
ORDER BY created_at DESC LIMIT 5;
```

---

## 5. Attribution + export

- Domain attribution: `src/lib/ai-cmo/attribution/calculate.ts` (`crmLinkedAccounts`, `crmLinkedClosedWonValue`)
- Executive export: `src/actions/abm-dashboard.ts`

---

## References

- Route: `src/app/api/integrations/crm/webhook/salesforce/route.ts`
- Reconciler SoR: `CRM_ACTIVITY_MIRROR` in `src/lib/sync/reconciler.ts`
