# Contract: Inbound Webhooks

All inbound webhooks MUST verify authenticity before side effects.

---

## POST /api/webhooks/chatwoot-ai

**Source:** Chatwoot `message_created` events  
**Auth (required — Wave 1):** Shared secret header or HMAC signature (configure in Chatwoot webhook settings)

**Payload (subset):**
```json
{
  "event": "message_created",
  "message": {
    "id": 123,
    "message_type": 0,
    "content": "string",
    "sender": { "id": 999 }
  },
  "conversation": { "id": 5678, "inbox_id": 1 },
  "inbox": { "id": 1 }
}
```

**Processing pipeline:**
1. Verify signature → 403 if invalid
2. Ignore bot-sent messages (loop prevention)
3. Check `is_globally_disabled` + canary hash on `conversation.id`
4. Enqueue Redis `queue:ai-orchestration` OR fail-closed to human assignment
5. Return 200 `{ "status": "queued" | "ignored", "reason"?: string }`

**Kill switch response:**
```json
{ "status": "ignored", "reason": "global_kill_switch_active" }
```

---

## POST /api/webhooks/chatwoot-ai-feedback

**Source:** Agent edits to AI-drafted messages  
**Auth:** Same as chatwoot-ai

**Behavior:** Persist to `ai_feedback` via join on `chatwoot_inbox_workspace_map` (not `inbox_id` column on logs)

---

## POST /api/webhooks/stripe

**Source:** Stripe billing events  
**Auth:** `Stripe-Signature` header verification (no mock fallback keys in production)

**Events:** `checkout.session.completed`, `customer.subscription.updated`, `invoice.paid`

---

## POST /api/crm/sync

**Status:** Currently unauthenticated — **must add** API key or internal secret before production (R1).

---

## POST /api/cron/ai-eval

**Auth:** `Authorization: Bearer ${CRON_SECRET}` or Vercel cron header  
**Behavior:** Sample 5% of daily `ai_conversation_logs`; write to `ai_evaluations`
