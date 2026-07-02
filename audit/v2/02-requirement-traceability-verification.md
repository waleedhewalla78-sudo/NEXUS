# Requirement Traceability Verification Matrix

This document reconciles requirements from `MASTER_BLUEPRINT.md` against actual codebase evidence.

## Traceability Matrix

| Req ID | Requirement Description | Related Components / Files | Related Tests | Current Status | Code Evidence / Gap |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-S01-01** | Multi-tenant RLS via `workspace_members` | [phase1_setup.sql](file:///d:/nexus-social-platform/nexus-social-app/src/sql/phase1_setup.sql) | Playwright `SEC-01` | **IMPLEMENTED_NOT_TESTED** | `is_workspace_member()` helper created. RLS applied to `posts` table. No automated test asserts correct blocks. |
| **REQ-S01-02** | Next.js Scaffold & Auth | `src/app/login/page.tsx`, `src/middleware.ts` | None | **VERIFIED_COMPLETE** | Login page redirects correctly. Middleware handles routing. |
| **REQ-S02-01** | Media Library & Upload | `src/actions/uploadMedia.ts`, `src/components/MediaLibrary.tsx` | None | **PARTIALLY_IMPLEMENTED** | Server Action `uploadMedia` fails due to `supabaseAdmin.auth.getSession()` session leak bug. |
| **REQ-S02-02** | Calendar Integration | `src/app/calendar/page.tsx`, `FullCalendarClient.tsx` | `load-tests/calendar-fetch.js` | **VERIFIED_COMPLETE** | FullCalendar React integration works and pulls schedule. |
| **REQ-S03-01** | Custom Chatwoot UI (No iframes) | `src/app/inbox/page.tsx`, `ConversationList.tsx` | None | **PARTIALLY_IMPLEMENTED** | Chatwoot API integration calls work, but `fetchConversations` Server Action is broken by `getSession()` bug. |
| **REQ-S03-02** | AI Reply Assist & PII Redaction | `src/actions/aiReply.ts`, `src/utils/pii.ts` | Playwright `AI-01` | **PARTIALLY_IMPLEMENTED** | PII regex redact exists, but the "AI Suggest" button sends a hardcoded `'system'` user ID which blocks auth checks. |
| **REQ-S04-01** | Recharts Dashboard | `src/app/analytics/AnalyticsDashboard.tsx` | None | **PARTIALLY_IMPLEMENTED** | Recharts is implemented in the dashboard, but defaults to fake `DEMO_ANALYTICS` because database queries fail. |
| **REQ-S05-01** | WhatsApp/SMS native provisioning | `src/actions/omnichannel.ts` | None | **PARTIALLY_IMPLEMENTED** | Calls Chatwoot API correctly, but the Server Action fails due to `supabaseAdmin.auth.getSession()`. |
| **REQ-S05-02** | Mobile Companion App | `nexus-mobile/app/index.tsx` | None | **MOCKED_OR_STUBBED** | Mobile app is a shell with notification hooks, no real dashboard or inbox features exist. |
| **REQ-S06-01** | AI Fine-Tuning Pipeline | `src/actions/ai-finetune.ts` | None | **PARTIALLY_IMPLEMENTED** | OpenAI fine-tuning client code is written, but Server Action fails due to `auth.getSession()` on service role. |
| **REQ-S06-02** | FastAPI Predictive Analytics | `ml-service/main.py` | `ml-service/test_api.py` | **IMPLEMENTED_NOT_INTEGRATED** | Prophet/RandomForest service runs. However, no client pages or backend jobs call the endpoint. |
| **REQ-S07-01** | Magic Link approvals | `src/actions/approvals.ts`, `src/app/approve/[token]/page.tsx` | Playwright `AI-03` | **PARTIALLY_IMPLEMENTED** | Implements token decoding, but has no cryptographic verification/signatures. Token is simple Base64. |
| **REQ-S07-02** | Immutable Audit Logs | `src/lib/audit.ts`, `enterprise_schema.sql` | None | **VERIFIED_COMPLETE** | Audit logs table created and called from actions. |
| **REQ-S08-01** | stripe credit ledger updates | `src/actions/billing.ts` | Playwright `BILL-01` | **PARTIALLY_IMPLEMENTED** | updates credits via a read-then-write sequence, which is vulnerable to race conditions (non-atomic updates). |
| **REQ-S09-01** | Public API Redis rate limiting | `src/middleware/api-auth.ts` | None | **VERIFIED_COMPLETE** | Redis `incr` and `expire` are used in middleware to limit keys. |
| **REQ-S10-01** | Visual Automations canvas | `src/app/automations/builder/page.tsx` | `load-tests/automation-execution.js` | **PARTIALLY_IMPLEMENTED** | ReactFlow renders correctly, but the deploy flow does not hook into any actual automation runner. |
| **REQ-S10-02** | Enterprise Migration Hub | `src/app/settings/migration/page.tsx` | None | **PARTIALLY_IMPLEMENTED** | Migration hub UI handles CSV/JSON upload, but the `enterprise-migrations` bucket is missing in DB schema. |
| **REQ-S11-01** | Observability & Hardening | `src/lib/opentelemetry.ts`, `sentry.server.config.ts` | None | **IMPLEMENTED_NOT_INTEGRATED** | OTEL SDK initialized but never started (missing `instrumentation.ts`). Sentry initialized with default configs. |
| **REQ-W01-01** | Isolated Dify App & Dataset | `src/actions/ai-agent-provision.ts` | None | **VERIFIED_COMPLETE** | Calls Dify API to create dataset and chat app correctly. |
| **REQ-W02-01** | Chatwoot Webhook Ingestion | `src/app/api/webhooks/chatwoot-ai/route.ts` | Playwright `AI-02` | **PARTIALLY_IMPLEMENTED** | Receives webhook, but background job processing is dead (jobs are pushed to Redis but never popped). |
| **REQ-W03-01** | HITL refund approval magic link | `src/jobs/ai-orchestration.ts` | Playwright `AI-03` | **PARTIALLY_IMPLEMENTED** | Code checks for `pending_approval` and sends private notes, but worker is dead. |
| **REQ-W04-01** | LLM-as-a-Judge | `src/jobs/ai-evaluation.ts`, `src/app/api/cron/ai-eval/route.ts` | None | **PARTIALLY_IMPLEMENTED** | Evaluation logic is implemented but job is never triggered. |
| **REQ-W05-01** | Global Kill Switch / Token Limits | `src/lib/ai/token-limiter.ts`, `route.ts` | Playwright `AI-02` | **PARTIALLY_IMPLEMENTED** | checks limit in webhook, but token increment is in the dead worker code. |

## Orphan Requirements (No Code Implementation Found)
1. **SSO/SAML Auth:** Mentioned in Sprint 7 but no configurations, actions, or pages exist in the codebase.
2. **Outbound Webhooks:** Mentioned in Sprint 9, database table `webhook_subscriptions` exists, but no dispatcher/scheduler executes hooks.
3. **Enterprise Data Migration Hub Background Processing:** React code uploads to database, but the background job `process-migration.ts` is dead.

## Orphan Code (Implemented Code with No Active Requirements)
1. **`frontend` app:** An unused, empty Next.js starter template is committed under `/frontend`.
2. **`nexus-social` dir:** Empty placeholder containing only `node_modules`.
