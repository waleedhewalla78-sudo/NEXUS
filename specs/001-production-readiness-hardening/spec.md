# Feature Specification: Production Readiness Hardening

**Feature Branch**: `001-production-readiness-hardening`

**Created**: 2026-06-20

**Status**: Ready for validation

**Input**: User description: "Specify what is needed to complete the project based on the production readiness audit done for the project status in this thread, addressing all critical vulnerabilities, background worker gaps, database schema omissions, and telemetry integration requirements."

## Clarifications

### Session 2026-06-22

- Q: Which local dev port should Next.js use to avoid conflicts with stack services (3000–3004)? → A: **3005** (reserved in `scripts/dev-port.ps1`, `package.json`, `.env.local`).
- Q: How should preflight build placeholders interact with local dev runtime? → A: Placeholders apply **only during `npm run build` in preflight**; shell vars are restored/cleared so Supabase auth uses real `.env.local` values.
- Q: Primary local auth method for login testing? → A: **Supabase email/password** via `/login` (sign up or sign in with workspace-scoped session).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Secure Inbound AI Orchestration (Priority: P1)

As an inbound customer, I want the system to safely ingest and reply to my messages using my specific brand's context, without exposing my data to other tenants or dropping my query.

**Why this priority**: Correcting the background processing daemon and multi-tenant key configuration is the most critical functional blocker. Without this, no messages receive AI replies, and client contexts leak.

**Independent Test**: Can be tested independently by pushing a message to the Chatwoot inbox, verifying it is enqueued, popped, and handled by the background worker using the correct workspace Dify key, and checking that the conversation is correctly isolated.

**Acceptance Scenarios**:

1. **Given** a message is received on Chatwoot inbox A, **When** webhook is triggered, **Then** the job is enqueued in Redis, popped by the worker daemon, and processed using the Dify app key assigned to workspace A.
2. **Given** a message is received on Chatwoot inbox B, **When** RAG queries are executed, **Then** the system uses the Dify app key assigned to workspace B, keeping it fully isolated from workspace A.

---

### User Story 2 - Cryptographically Secure Approvals (Priority: P1)

As a human specialist, I want the magic links sent for financial refund approvals to be cryptographically signed and untamperable, so that malicious actors cannot execute unauthorized refunds.

**Why this priority**: Eliminates a severe security vulnerability that allows spoofing and unauthorized financial operations.

**Independent Test**: Can be tested independently by generating a signature-secured magic link, confirming it decodes and validates on click, and confirming that modifying the token data (e.g. changing the refund amount or conversation ID) immediately throws a 403 signature verification error.

**Acceptance Scenarios**:

1. **Given** a signed refund magic link token, **When** clicked by a reviewer within 24 hours, **Then** the signature is verified, the transaction succeeds, and audit logs are written.
2. **Given** a tampered magic link token, **When** accessed, **Then** signature validation fails and return a 403 error.

---

### User Story 3 - Gatekeeper API Key & Rate Limiting (Priority: P2)

As a workspace administrator, I want developer API keys and rate limits to be checked before processing public requests, to protect our backend from abuse and unauthorized data access.

**Why this priority**: Secures public routes from completely open access and tenant identity spoofing.

**Independent Test**: Can be tested by hitting the public API endpoints with a missing, wrong, or rate-exceeded API key, verifying that the gateway blocks the requests with 401 Unauthorized or 429 Too Many Requests.

**Acceptance Scenarios**:

1. **Given** a valid API key with unused rate limit, **When** request is made, **Then** the key is verified, usage incremented in Redis, and access granted to the correct workspace ID.
2. **Given** an invalid or rate-exceeded API key, **When** request is made, **Then** the request is blocked.

---

### User Story 4 - High-Fidelity Feedback Logs (Priority: P2)

As a product manager, I want the system to correctly capture and log human agent edits and feedback on AI-generated replies, so that we have high-fidelity training data to improve the AI's accuracy.

**Why this priority**: Resolves database query failures when receiving agent feedback webhooks (crashes due to references to the non-existent `inbox_id` column).

**Independent Test**: Trigger the feedback webhook endpoint with a valid payload, verifying that it executes the SQL query without errors and persists the feedback log in the database.

**Acceptance Scenarios**:

1. **Given** a human agent edits an AI-generated reply, **When** the feedback webhook is triggered, **Then** the database inserts the record matching the correct schema relationships (e.g., querying table joins rather than a non-existent column).

---

### User Story 5 - Automated Quality Evaluation (Priority: P2)

As a system operator, I want the platform to periodically run evaluation metrics on AI replies using a secondary LLM-as-a-Judge model, so that we can monitor reply quality and safety trends.

**Why this priority**: Activates the dormant quality evaluation pipeline and integrates it with cron schedules.

**Independent Test**: Invoke the cron endpoint manually, verifying that it pulls recent conversation samples, calls the evaluator engine, and records evaluation metrics in the database.

**Acceptance Scenarios**:

1. **Given** the evaluation cron is triggered, **When** new conversation replies are available, **Then** the system judges them for quality/safety, and writes the scores to the database.

---

### Edge Cases

- **Redis Database Connection Drop:** If the Redis queue is unavailable, the webhook listener must log the failure to Sentry and fail closed by assigning the message to a human agent, rather than crashing or swallowing the event.
- **Concurrent Credit Deductions:** If a user submits multiple caption requests simultaneously, the database must perform atomic updates (e.g., check constraint and atomic decrement) to prevent credit balance manipulation.
- **PII Redaction Auth Failures:** Webhook queries must mask sensitive user profile elements while maintaining correct user permissions. RAG suggestions must use the caller's actual session authentication instead of hardcoded bypasses.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST process enqueued Redis messages asynchronously using a background queue polling daemon.
- **FR-002**: System MUST retrieve workspace-specific Dify App Keys from `ai_agent_configs` and pass them in the Authorization header for RAG executions.
- **FR-003**: System MUST verify the HMAC sha256 signature of refund approval tokens using the `JWT_SECRET` key.
- **FR-004**: System MUST check developer API keys against database hashes and enforce Redis rate limits inside `apiAuthMiddleware.ts`.
- **FR-005**: Next.js Server Actions MUST authenticate user sessions using cookie-aware clients (`createServerClient`) rather than the sessionless service client.
- **FR-006**: System MUST initialize the `workspaces` and `users` tables before executing downstream schemas, and provision the `enterprise-migrations` storage bucket.
- **FR-007**: OpenTelemetry SDK MUST be initialized on application startup by importing the SDK inside Next.js `instrumentation.ts`.
- **FR-008**: System MUST write Sentry audit logs and database health checks that report down statuses correctly (returning HTTP 503 instead of masking with 200).
- **FR-009**: Database credit deductions MUST utilize atomic UPDATE commands to prevent billing race conditions.
- **FR-010**: The feedback webhook endpoint `/api/webhooks/chatwoot-ai-feedback/route.ts` MUST query correct database table relationships instead of the non-existent `inbox_id` column.
- **FR-011**: System MUST establish correct Docker container network host resolution and file mounts inside `docker-compose.prod.yml` and `otel-collector-config.yaml` to ensure clean inter-container communication.
- **FR-012**: System MUST run the RAG feedback evaluation loop via `/api/cron/ai-eval/route.ts` periodically.
- **FR-013**: Enterprise migration background worker MUST execute processing tasks when files are uploaded to the `enterprise-migrations` storage bucket.
- **FR-014**: RAG suggestions via `aiReply.ts` MUST use authenticated caller user IDs instead of hardcoded `'system'` to pass security middleware validation.

### Key Entities

- **ai_agent_configs**: Holds Dify App IDs, Dataset IDs, and newly added **App API Keys** mapping workspace configurations.
- **api_keys**: Stores hashed credentials and rate limiting tiers for API gateways.
- **workspaces**: Core multi-tenant workspace reference mapping all platform configurations.
- **ai_evaluation_logs**: Stores output metrics from LLM-as-a-Judge runs.
- **enterprise_migrations**: Queue of file upload records to be imported.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: AI replies are processed and sent to Chatwoot asynchronously in under 5 seconds from webhook receipt.
- **SC-002**: 100% of untrusted magic links or invalid API keys are blocked with zero false positives.
- **SC-003**: Telemetry traces and Sentry errors are successfully captured for 100% of background executions.
- **SC-004**: Database migrations execute on clean environments without error.
- **SC-005**: Human feedback webhooks resolve with 100% database persistence success and zero column reference errors.
- **SC-006**: The LLM-as-a-Judge loop evaluates and scores all unreviewed replies on each cron execution.

## Assumptions

- A local Redis instance is configured and active in the staging network.
- The `JWT_SECRET` environment variable is defined in all target deployments for HMAC signatures.
- Upstream Dify and Chatwoot APIs are configured and accessible via internal network hosts.
