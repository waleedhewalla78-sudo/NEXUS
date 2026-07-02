# Event Architecture Verification

This document analyzes the message queuing and event-driven patterns implemented in the repository, focusing on the connection between Chatwoot webhooks, Redis queues, and background job consumers.

## Event Map

| Producer | Event / Topic | Message Schema | Consumer | Action Taken | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Chatwoot Webhook** | `message_created` | `{ event, message, conversation }` | `queue:ai-orchestration` (Redis) | Enqueues payload into Redis. | **PARTIALLY_IMPLEMENTED** (Ingestion works, but queue sits unprocessed) |
| **Redis Queue** | `queue:ai-orchestration` | `{ workspaceId, aiBotUserId, chatwootPayload }` | `processAiOrchestrationJob` (Dead) | Runs Dify RAG & posts reply to Chatwoot. | **IMPLEMENTED_NOT_INTEGRATED** (No consumer loop runs to pop messages) |
| **Chatwoot Webhook** | `message_updated` | `{ event, message_type, status, content }` | `/api/webhooks/chatwoot-ai-feedback` | Calculates Levenshtein similarity. | **PARTIALLY_IMPLEMENTED** (Crashes due to database column name mismatch) |
| **Chatwoot Webhook** | `conversation_updated` | `{ event, status, id }` | `/api/webhooks/chatwoot-csat` | Sends 1-5 rating survey. | **VERIFIED_COMPLETE** (Successfully triggers survey on conversation close) |
| **Activepieces Webhook** | Outbound Webhook | `{ workspace_id, user_id, intent, query }` | Activepieces Flow | Triggers CRM / lead routing automation. | **IMPLEMENTED_NOT_INTEGRATED** (Webhook triggered, but Activepieces flow is not deployable) |

---

## Technical Verification & Gaps

### 1. Missing Consumer Daemon (Critical Gap)
While `/api/webhooks/chatwoot-ai/route.ts` successfully pushes messages to the Redis list `queue:ai-orchestration` using `LPUSH`, there is **no consumer daemon** (such as a worker running `BRPOP` in a loop or a BullMQ queue processor) running in the project. 
The worker container in `docker-compose.prod.yml` runs:
```yaml
command: ["node", "server.js"]
```
This simply runs a duplicate instance of the Next.js web application server. It does not initiate a background polling script or pop any jobs from Redis. As a result, events accumulate in Redis indefinitely, and no AI replies are generated in production.

### 2. Dead-Letter Queue (DLQ) & Retry Mechanisms
There is no DLQ or retry policy implemented for Redis queue failures. If an orchestration job fails:
*   The error is caught and reported to Sentry.
*   The conversation is assigned back to the human queue.
*   The event is permanently discarded with no automated retry, which could lead to data loss during network hiccups.

### 3. Broken Idempotency Logic
Inside `src/jobs/ai-orchestration.ts`, the code defines:
```typescript
const jobIdempotencyKey = `ai_replied_msg_${chatwootPayload.message.id}`;
```
However, **this key is never used anywhere in the codebase**. It is not checked or set in Redis or the database. If Chatwoot sends duplicate webhook payloads (common during network retries), the AI agent will process them multiple times, leading to duplicate customer replies and wasted AI credits.
