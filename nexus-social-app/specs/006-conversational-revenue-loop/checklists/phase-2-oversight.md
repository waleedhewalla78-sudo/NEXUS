# Feature 006 Phase 2 — Oversight Runbook (FR-089)

**Purpose:** Flip Shadow → AI-Active only after client sign-off. Pit Crew remains Chatwoot (CL-049).

---

## Preconditions

- [ ] Phase 1 Shadow UAT passed (`phase-1-uat.md`)
- [ ] Migration `20260720_conversation_qualification_tables.sql` applied
- [ ] Chatwoot inbox mapped for pilot workspace
- [ ] Client written sign-off on draft quality (store in CRM / Notion)

---

## Flip to AI-Active

```http
PATCH /api/v1/ai-cmo/conversations/mode
Content-Type: application/json

{
  "workspaceId": "<pilot-workspace-uuid>",
  "mode": "ai_active",
  "userId": "<operator-user-id>"
}
```

Verify:

```http
GET /api/v1/ai-cmo/conversations/mode?workspaceId=<uuid>
```

Expect `"mode": "ai_active"`.

**Rollback:** PATCH `mode` to `"shadow"` immediately if quality regresses.

---

## Human takeover drill (required before scale)

1. Send a test inbound that triggers escalation (e.g. legal threat language) — expect private note + assign, **no** public AI send.
2. Send a normal warm lead in AI-Active — expect public Concierge reply.
3. Human edits the reply in Chatwoot — confirm `chatwoot-ai-feedback` captures annotation → `ai_cmo_learnings`.
4. Confirm Pit Crew can take over any open conversation in Chatwoot without Nexus UI.

---

## Incident response

| Symptom | Action |
|---------|--------|
| Bad dialect / brand risk | PATCH mode → `shadow` |
| Escalation storm | Check confidence threshold / sentiment rules; set mode `off` temporarily |
| Chatwoot API down | Concierge still persists qualifications; delivery returns demo/error — humans use Chatwoot when restored |
| Margin FAIL (Phase 3) | Do **not** scale AI-Active to more workspaces (CL-053) |

---

## Sign-off record

| Field | Value |
|-------|-------|
| Workspace ID | |
| Client contact | |
| Sign-off date | |
| Operator | |
| Mode after drill | `ai_active` / rolled back to `shadow` |
