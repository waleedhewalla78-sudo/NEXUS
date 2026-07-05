# 8. Business Scenarios

← [PRD Index](./README.md) · [04 Personas](./04-user-personas-workflows.md)

---

## BS-01 — Land enterprise pilot (target state)

| Step | Action | Outcome |
|------|--------|---------|
| 1 | Prospect submits `/enterprise` form | Lead in `enterprise_leads` |
| 2 | Founder qualifies → sales call | `status → contacted` |
| 3 | $3k pilot SOW signed | Sprint 4 unlock |
| 4 | Provision workspace + ABM seed | Client logs in |
| 5 | LinkedIn OAuth connected | Publish demo |
| 6 | 30-day AI campaigns | Content + cost ledger |
| 7 | `generate:pilot-report` | Executive summary PDF |
| 8 | CMO reviews `/ai-cmo/attribution` | Pipeline validated |
| 9 | Upsell $5k/mo retainer | **Sprint 6 Ready** |

**Success metrics:** Influenced deal story; ≥55% margin; qualitative NPS.

**Current gap:** Steps 3–4 blocked (no signed client); Step 7 script ready but not run on prod WS.

---

## BS-02 — Weekly intelligence delivery (live capability)

| Step | Action | Outcome |
|------|--------|---------|
| 1 | Client exports GA4 CSV | File ready |
| 2 | CMO uploads `/intelligence` | Ingest + anomalies |
| 3 | Cron or manual brief | `intelligence_briefs` |
| 4 | Copy to PowerPoint | Board ready |

**Success metrics:** Brief &lt;30s fallback / &lt;10s LLM; anomaly on &gt;20% swing.

**Current gap:** Prod DB migration not applied — tables missing.

---

## BS-03 — Meta ad lead → sales follow-up

| Step | Action | Outcome |
|------|--------|---------|
| 1 | Meta form submitted | Webhook POST |
| 2 | HMAC verified | Lead `source=meta_ads` |
| 3 | AE views `/enterprise/leads` | Follow-up &lt;24h |

**Success metrics:** Webhook &lt;2s; no duplicate leadgen_id.

---

## BS-04 — Compliance block HIGH-risk campaign

| Step | Action | Outcome |
|------|--------|---------|
| 1 | Sensitive claim generated | Tier HIGH |
| 2 | Auto-publish blocked | Approval queue |
| 3 | Legal approves magic link | Audit log |
| 4 | Content publishes | Full trail |

**Success metrics:** 0 CRITICAL auto-publish; 100% HIGH queued.

---

## BS-05 — Agency scale Client #2 (BLOCKED)

| Step | Action | Outcome |
|------|--------|---------|
| 1 | Client #1 pays retainer | Sprint 6 unlock |
| 2 | POST Pit Crew provision | Workspace in 60s |
| 3 | Monitor `/admin/margins` | Margin ≥55% |

**Gate:** CL-036 payment not received.
