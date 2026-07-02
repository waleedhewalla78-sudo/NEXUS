# Contract: HTTP API Routes

Base URL: `http://localhost:3000` (production: configured domain)

---

## Health

### GET /api/health

**Auth**: None

**Response 200** (healthy):
```json
{
  "status": "ok",
  "timestamp": "ISO8601",
  "version": "0.1.0",
  "details": {
    "db": "up|down",
    "redis": "up|down",
    "chatwoot": "up|down",
    "dify": "up|down",
    "overall": "healthy|down"
  }
}
```

**Response 503**: `status: "error"` when `overall: down` (production strict).

---

## Webhooks

### POST /api/webhooks/chatwoot-ai

**Headers**: `x-e2e-test: true` (dev fixture for inbox_id=1)

**Body**: Chatwoot `message_created` event

**Response 200**:
```json
{ "status": "enqueued|ignored", "reason": "..." }
```

### POST /api/webhooks/stripe

**Headers**: `Stripe-Signature` required in production

**Response**: 400/401 on invalid signature

---

## Public API v1

### GET /api/v1/posts

**Auth**: `Authorization: Bearer <api_key>`

**Response**: 401 invalid key, 429 rate exceeded, 200 with posts array

### GET /api/v1/workspaces

**Auth**: Bearer API key

---

## Cron (protected)

### GET /api/cron/ai-eval

**Auth**: Cron secret header (env)

**Behavior**: Triggers `runAIEvaluationJob()`

---

## Setup

### GET /api/setup/sql

**Query**: `?file=patch` → returns `schema_patch.sql`; default → `essential_bootstrap.sql`

**Response**: `text/plain` SQL content
