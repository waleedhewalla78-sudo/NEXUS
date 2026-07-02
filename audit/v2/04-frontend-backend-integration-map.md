# Frontend-Backend Integration Map

This map outlines the connection chains between frontend UI pages, server-side APIs, database services, and automated test validations.

## Integration Map

| Page / Component | API / Server Action | Backend Service | Database Tables / RPCs | Tests | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Unified Inbox** (`src/app/inbox/page.tsx`) | `fetchConversations`, `sendReply` | Chatwoot API | `channel_credentials` | None | **PARTIALLY_IMPLEMENTED** (Broken by Server Action `auth.getSession()` cookie bug) |
| **Message Composer AI Suggest** (`src/components/inbox/MessageComposer.tsx`) | `aiReply` | Dify API, Activepieces Webhook | `workspace_members`, `ai_credit_ledger` | None | **PARTIALLY_IMPLEMENTED** (Passes hardcoded `'system'` user ID which fails membership validation) |
| **Automations Canvas** (`src/app/automations/builder/page.tsx`) | `cloneTemplate` | ReactFlow Canvas | `automation_flows` | `automation-execution.js` | **PARTIALLY_IMPLEMENTED** (Canvas loads, but Deploy Flow button is not connected to a background runner) |
| **Analytics Dashboard** (`src/app/analytics/page.tsx`) | `getAnalytics` | ML Service, Supabase | RPC `get_workspace_analytics`, `predictions` | None | **PARTIALLY_IMPLEMENTED** (Queries fail on server due to sessionless public client, silently falls back to dummy demo data) |
| **AI Performance Dashboard** (`src/app/analytics/ai-performance/page.tsx`) | `getAiAnalytics` | Supabase | RPC `get_ai_analytics` | None | **PARTIALLY_IMPLEMENTED** (Visualizes evaluation metrics, but data is empty because background evaluation cron fails) |
| **Migration Hub** (`src/app/settings/migration/page.tsx`) | Client-side Supabase client | Supabase Storage | `migration_status` | None | **PARTIALLY_IMPLEMENTED** (CSV uploads fail because required storage bucket `enterprise-migrations` is not initialized) |
| **Post Creator Dialog** (`src/components/CreatePostDialog.tsx`) | `createPost`, `generateCaption`, `uploadMedia` | Dify API, Supabase Storage | `posts`, `workspace_members`, `ai_credit_ledger` | `post-creation.js` | **PARTIALLY_IMPLEMENTED** (`uploadMedia` Server Action fails due to session check using admin key) |
| **Reputation Dashboard** (`src/app/reputation/page.tsx`) | `getReputationMetrics` (from `reputation.ts`) | Supabase | `listening_queries`, `mentions`, `external_reviews` | None | **PARTIALLY_IMPLEMENTED** (Dashboard visualizes reviews, but scraper cron is dead) |
| **Client Portal** (`src/app/(client-portal)/dashboard/page.tsx`) | `getClientSettings` | Supabase | `client_users`, `posts` | None | **PARTIALLY_IMPLEMENTED** (Portal renders, but strict RLS check for parent client is not covered by tests) |

---

## Analysis of Integration Failure Points

1.  **Server Action Cookie Isolation:** Next.js Server Actions running in standard environments do not share cookies automatically with the global `supabaseAdmin` service-role client. The server actions in `inbox.ts`, `ai-finetune.ts`, and `omnichannel.ts` invoke `supabaseAdmin.auth.getSession()`, which returns `null`. This blocks all authenticated user actions.
2.  **Disconnected Frontend Automation:** The visual automations UI uses `ReactFlow` to display templates, but there is no API routing or database trigger connecting the canvas deployment to the backend worker in `execute-automation.ts`.
3.  **Silent Analytics Fallback:** When the database query fails on the server, `getAnalytics()` catches the error and silently returns static mockup data. This masks database connectivity issues and prevents proper production monitoring.
