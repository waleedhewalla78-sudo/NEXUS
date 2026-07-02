# Contract: AI Internal Tool Proxies

Dify custom tools call these Next.js routes. All require header:

`X-Internal-Tool-Secret: ${INTERNAL_TOOL_SECRET}`

Input validation: Zod schemas on every route.

---

## POST /api/tools/check-order-status (Read — autonomous)

**Body:**
```json
{ "order_id": "string", "workspace_id": "uuid" }
```

**Response 200:**
```json
{
  "order_id": "string",
  "status": "shipped|processing|not_found",
  "estimated_delivery": "ISO8601|null"
}
```

**Timeout:** 10s max; orchestration handles `not_found` gracefully

---

## POST /api/tools/issue-refund (Write — HITL)

**Body:**
```json
{
  "order_id": "string",
  "amount_cents": 1000,
  "conversation_id": "string",
  "workspace_id": "uuid"
}
```

**Response 202:**
```json
{
  "status": "pending_approval",
  "approval_url": "https://app/approve/{hmac-token}"
}
```

Does NOT execute refund until human approves via magic link.

---

## GET /api/tools/approve-refund?token={payload}.{sig}

**Auth:** HMAC sha256 over payload with `JWT_SECRET`  
**Success:** Executes refund once, writes audit log  
**Errors:** 403 tampered/expired token

---

## POST /api/tools/create-support-ticket (Write — configurable HITL)

Creates ticket in external system; may require approval based on workspace policy.

---

## Tool registration

`src/actions/ai-register-tools.ts` binds OpenAPI specs from `src/lib/tools/openapi-specs.ts` to workspace Dify app on provision.

**Tests:** `src/app/api/tools/__tests__/proxy-routes.test.ts` (7 Vitest cases — passing)
