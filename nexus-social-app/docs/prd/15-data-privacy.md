# 15. Data & Privacy

← [PRD Index](./README.md) · [10 Auth & Roles](./10-auth-roles-permissions.md)

---

## 15.1 Data collection

| Data type | Storage | Purpose |
|-----------|---------|---------|
| User identity | Supabase Auth | Session |
| OAuth tokens | Encrypted vault / connections | Publish |
| Campaign content | `ai_cmo_content_pieces` | Operations |
| Lead PII | `enterprise_leads` | Sales |
| Intelligence CSV | `intelligence_ingests.raw_data` | Briefing |
| CRM deals | `crm_activity_mirror` | Attribution |
| Cost data | `ai_cmo_cost_ledger` | FinOps |
| Audit events | `audit_logs` | Compliance |

---

## 15.2 Compliance frameworks

| Framework | Status |
|-----------|--------|
| GDPR | Policy flags; admin export; regional tenant |
| UAE PDPL | MENA compliance profile in settings |
| Egypt DPL | Constitution reference |
| Meta App Review | Required for FB/IG publish |

---

## 15.3 Privacy safeguards

| Policy | Implementation |
|--------|----------------|
| Workspace isolation | RLS mandatory |
| PII scrubber | Memory ingestion |
| Secrets | Never in repo/logs |
| Demo analytics | Off in production |
| Data export | Admin-only |
| Retention periods | **STK-009 — Product policy TBD** |

---

## 15.4 Data deletion

| Action | Path |
|--------|------|
| Remove team member | `team-management.ts` |
| Full tenant delete | **Underspecified — manual Supabase** |

---

## 15.5 Intelligence data handling

- Raw CSV stored as JSONB in `intelligence_ingests`
- No native GA4 API — client exports and uploads
- Brief text in `intelligence_briefs` — copy-only V1 (no PDF)

**Open question OQ-005:** Persist imports long-term vs ephemeral — Product decision pending.
