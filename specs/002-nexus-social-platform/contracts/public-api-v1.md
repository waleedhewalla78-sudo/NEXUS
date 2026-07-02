# Contract: Public API v1

Base path: `/api/v1`  
Authentication: Header `X-API-Key: <raw-key>` (hashed server-side)  
Rate limiting: Per workspace tier via Redis (401/429 responses)

---

## GET /api/v1/posts

List scheduled/published posts for the authenticated workspace.

**Query params:** `status` (optional), `limit`, `offset`

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "content": "string",
      "scheduled_at": "ISO8601",
      "status": "draft|scheduled|published",
      "media_urls": ["string"]
    }
  ],
  "meta": { "total": 0 }
}
```

**Errors:** 401 invalid key, 429 rate exceeded

---

## POST /api/v1/posts

Create a post in the authenticated workspace.

**Body:**
```json
{
  "content": "string",
  "scheduled_at": "ISO8601",
  "media_urls": ["string"]
}
```

**Response 201:** Created post object (same shape as GET item)

---

## GET /api/v1/audit_logs

Enterprise tier: list immutable audit entries for workspace.

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "action": "string",
      "actor_id": "uuid",
      "created_at": "ISO8601",
      "payload": {}
    }
  ]
}
```

---

## Middleware contract

`src/middleware/api-auth.ts` MUST:
1. Extract `X-API-Key`
2. Hash and lookup `api_keys.key_hash`
3. Increment Redis counter `rate_limit:{workspace_id}` with 60s TTL
4. Attach `workspaceId` to request context
5. **Return `NextResponse.next()` on success** (current bug: missing return)

**Status:** Routes not implemented—Cypress `integrations-api.cy.ts` expects these endpoints (Wave 3).
