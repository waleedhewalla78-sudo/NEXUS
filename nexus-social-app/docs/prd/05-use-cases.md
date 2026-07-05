# 5. Use Cases

← [PRD Index](./README.md) · [04 Personas](./04-user-personas-workflows.md) · [06 Functional Requirements](./06-functional-requirements.md)

---

## UC-001 — Schedule and publish social post

| Field | Detail |
|-------|--------|
| **Actor** | P3 Marketing Operator |
| **Preconditions** | OAuth connected; workspace member; token encrypted |
| **Main flow** | `/posts/create` → compose → schedule/publish → worker → SoR updated |
| **Alt** | Token expired → re-auth `/settings/integrations` |
| **Edge** | Meta publish blocked if App Review ≠ approved |
| **Success** | Post `published`; analytics enqueued |

## UC-002 — Run AI CMO campaign (async)

| Field | Detail |
|-------|--------|
| **Actor** | P3 |
| **Preconditions** | Session/API key; budget configured |
| **Main flow** | Brief wizard → POST brief → 202 jobId → poll job → completed |
| **Alt** | Budget exceeded → fail fast (Postman B) |
| **Edge** | Uniqueness guard on repeat UAT |
| **Success** | `ai_cmo_campaigns.status = completed` |

## UC-003 — Capture enterprise inbound lead

| Field | Detail |
|-------|--------|
| **Actor** | P6 |
| **Preconditions** | Enterprise landing enabled; migration `20260705` applied |
| **Main flow** | `/enterprise` → form → POST inbound → 201 |
| **Alt** | Rate limit → 429 |
| **Edge** | Missing table → 500 schema cache |
| **Success** | Row `source=website_form`, `status=new` |

## UC-004 — Meta Lead Ads webhook

| Field | Detail |
|-------|--------|
| **Actor** | Meta system |
| **Preconditions** | `META_WEBHOOK_SECRET`; migration applied |
| **Main flow** | GET challenge → POST + HMAC → parse → insert `meta_ads` |
| **Alt** | Bad signature → 403 |
| **Success** | Visible in `/enterprise/leads` |

## UC-005 — Intelligence CSV + brief

| Field | Detail |
|-------|--------|
| **Actor** | P2 CMO |
| **Preconditions** | Migration `20260715`; ≥2 CSV rows |
| **Main flow** | Upload → ingest → brief (manual or cron) → copy |
| **Alt** | OpenRouter down → fallback brief |
| **Edge** | &lt;2 rows → 400 |
| **Success** | `intelligence_briefs.status=ready` |

## UC-006 — LinkedIn OAuth

| Field | Detail |
|-------|--------|
| **Actor** | P1/P3 |
| **Preconditions** | LinkedIn secrets; redirect URI exact |
| **Main flow** | Integrations → Connect → callback → token stored |
| **Success** | Token in social connections / vault |

## UC-007 — ABM playbook activation

| Field | Detail |
|-------|--------|
| **Actor** | P3 |
| **Preconditions** | ABM seeded |
| **Main flow** | `/ai-cmo/abm` → activate → 202 playbook run |
| **Success** | `abm_playbook_runs` row created |

## UC-008 — Pilot ROI simulation

| Field | Detail |
|-------|--------|
| **Actor** | P1 |
| **Preconditions** | `PILOT_WORKSPACE_ID`; ABM row; service role |
| **Main flow** | VPS host → source `.env.production` → `npm run generate:pilot-report` |
| **Note** | **Not** inside `nexus-social-prod` container |
| **Success** | Executive summary + data in SoR |

## UC-009 — HubSpot closed-won sync

| Field | Detail |
|-------|--------|
| **Actor** | P5 |
| **Preconditions** | HubSpot OAuth or PAT |
| **Main flow** | Connect → `npm run sync:hubspot-deals` |
| **Success** | `crm_activity_mirror` updated |

## UC-010 — Pit Crew provision (BLOCKED)

| Field | Detail |
|-------|--------|
| **Actor** | P1 |
| **Status** | **Not implemented** — CL-036 payment gate |
| **Planned** | POST `/api/admin/provision-client` + `x-admin-secret` |
