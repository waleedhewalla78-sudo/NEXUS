# 🚀 Nexus Social Platform: Master AI Integration Blueprint & QA Test Strategy
**The Ultimate Execution & Validation Guide for Google Antigravity**

This document is the definitive, end-to-end master blueprint for building, integrating, and validating **Nexus Social**, an enterprise-grade, AI-native omnichannel social media management and customer service platform. 

It is specifically engineered to be executed within **Google Antigravity** (or similar advanced AI coding environments), leveraging the SCADA prompting framework to prevent context-window overload and ensure production-grade code quality.

---

## 📑 Document Structure
*   **Part 1:** Core SaaS Platform Architecture (Sprints 1-11)
*   **Part 2:** Omnichannel AI Agent Blueprint & Execution Prompts (Weeks 1-5)
*   **Part 3:** Comprehensive QA Master Test Strategy
*   **Part 4:** Google Antigravity Execution Manual

---

# PART 1: Core SaaS Platform Architecture (Sprints 1-11)

The core platform is built on a composable, open-source microservices architecture to maximize development speed while maintaining enterprise security. 
**Stack:** Next.js (App Router), Supabase (PostgreSQL/Auth/Storage), Dify.ai (RAG), Chatwoot (Inbox), Activepieces (Automation).

### The 11-Sprint Delivery Roadmap
| Sprint | Focus Area | Key Deliverables & Guardrails |
| :--- | :--- | :--- |
| **1** | **Foundation & Auth** | Next.js scaffold, Supabase SSR Auth, Multi-tenant RLS (`workspace_members` join), UI Shell. |
| **2** | **Content Engine & AI** | Media Library, FullCalendar integration, Post Creation Modal, Dify API for AI captions. |
| **3** | **Unified Inbox & AI** | Custom Chatwoot UI (No iframes), AI Reply Assist with PII redaction, Activepieces lead routing. |
| **4** | **Analytics & Polish** | Recharts dashboard, White-labeling (CSS variables), Production Dockerfile, `.env.example`. |
| **5** | **Omnichannel & Mobile** | WhatsApp/SMS via Chatwoot native provisioning (no custom crypto), React Native (Expo) scaffold. |
| **6** | **Advanced AI & ML** | Custom AI Fine-Tuning pipeline (PII redacted), Python FastAPI ML microservice for predictive analytics. |
| **7** | **Enterprise Scale** | SSO/SAML, Immutable Audit Logs, "Nexus Pages" (Link-in-Bio via JSON blocks), Magic Link approvals. |
| **8** | **Monetization** | Stripe webhooks, AI Credit Ledger (atomic DB updates), Agency Client Portals (strict `parent_client_id` RLS). |
| **9** | **Developer Ecosystem** | Public API (Redis rate limiting), Outbound Webhooks, Advanced Custom Report Builder (`react-grid-layout`). |
| **10** | **Automations & i18n** | Visual Automations (`reactflow`), `next-intl` localization, Enterprise Data Migration Hub (chunked background jobs). |
| **11** | **Launch Hardening** | Sentry error tracking, Automation Templates, Social Previews, `driver.js` onboarding, `k6` load tests. |

---

# PART 2: Omnichannel AI Agent Blueprint (Weeks 1-5)

While Sprints 1-11 built the SaaS shell, Weeks 1-5 build the **Autonomous AI Brain** that lives inside it. 

### Architecture Overview
```text
[External Channels]       [Ingestion Layer]        [Cognitive Layer]       [Action Layer]
 Facebook/IG/WhatsApp  -->                     -->                     --> 
 LinkedIn/X/Email/Web  -->   Chatwoot (API)    -->   Dify.ai (RAG/LLM) --> Activepieces/Tools
                           (Normalizes all       (Retrieves context,       (Executes CRM, 
                            messages to a          generates response,       payments, tickets)
                            standard format)       manages memory)
```

### 🤖 The 5-Week AI Execution Prompts for Google Antigravity
*Instructions: Copy and paste these prompts sequentially into Google Antigravity. Wait for the agent to complete the specified tasks before moving to the next prompt.*

#### 📋 Week 1 Prompt: Data & RAG Foundation
```text
Act as an Expert AI Architect and Full-Stack Engineer. We are executing WEEK 1 of the Omnichannel AI Customer Service Agent blueprint: Data & RAG Foundation.

We are transitioning our existing Dify integration into a full, multi-tenant Customer Service Agent. Follow the SCADA framework strictly.

### [S] SITUATION
1. Multi-Tenant AI Provisioning: Create a system where every new workspace gets its own isolated Dify Dataset and Chat App.
2. Core Persona & Prompt Engineering: Configure the foundational System Prompt.
3. Knowledge Base Ingestion: Build a pipeline to upload, clean, and index documents.
4. Database Tracking: Create Supabase schema to map workspaces to Dify IDs.

### [C] CONTEXT
1. REUSE EXISTING CODE: Import/extend `src/lib/dify/client.ts` and the `redactPII()` utility from Sprint 3.
2. STRICT MULTI-TENANCY: Use Dify API to create a separate `dataset_id` for each `workspace_id`.
3. ZERO REGRESSION: Do not break the existing `generateCaption` server action.

### [A] ACTION
**Task 1: Supabase Schema**
- Create `ai_agent_configs` (maps workspace_id to dify_app_id, dify_dataset_id, persona_name, system_prompt_override).
- Create `ai_conversation_logs` (stores workspace_id, channel, external_conversation_id, user_query, ai_response, confidence_score, tokens_used).
- Apply strict RLS via `workspace_members` join.

**Task 2: Multi-Tenant Dify Provisioning**
- Create `src/actions/ai-agent-provision.ts`.
- Write `provisionWorkspaceAgent(workspaceId, companyName)` to call Dify API to create a Dataset and Chat App, saving the IDs to `ai_agent_configs`.

**Task 3: Core System Prompt**
- Create `src/lib/ai/personas.ts` using the CREATE framework. Instruct AI to only use RAG context and escalate if confidence is low.

**Task 4: Knowledge Base Ingestion**
- Create `src/actions/ai-knowledge-ingest.ts`.
- Write `ingestDocument` to fetch `dataset_id`, pass content through `redactPII()`, and call Dify API to upload text.

### [A] ACCEPTANCE
Address: Dify API timeouts on large PDFs, PII redaction edge cases (don't redact SKUs), App ID collisions (upsert instead of duplicate), and System Prompt Injection prevention.

**EXECUTION DIRECTIVE:** Begin with Task 1 and Task 2. Stop and wait for review.
```

#### 📋 Week 2 Prompt: Chatwoot Ingestion & Orchestration
```text
Act as an Expert AI Architect. We are executing WEEK 2: Chatwoot Ingestion & Orchestration Middleware. We are connecting Chatwoot to the Multi-Tenant Dify RAG Agent.

### [S] SITUATION
1. Webhook Ingestion: Build Next.js API route for Chatwoot `message_created` webhooks.
2. Orchestration & Memory: Map Chatwoot conversations to Dify sessions, apply PII redaction.
3. Response Routing & HITL: Send AI response back to Chatwoot. Route low-confidence to humans.
4. Background Processing: Offload to background worker (Inngest/BullMQ).

### [C] CONTEXT
1. REUSE EXISTING CODE: Use `src/lib/chatwoot/client.ts`, `src/lib/dify/client.ts`, and `redactPII()`.
2. STRICT MULTI-TENANCY: Map Chatwoot `inbox_id` to Nexus `workspace_id` to fetch correct `dify_app_id`.
3. NO INFINITE LOOPS: Webhook handler must ignore messages sent by the AI bot itself.

### [A] ACTION
**Task 1: Webhook Listener & Mapping**
- Create `chatwoot_inbox_workspace_map` table.
- Create `src/app/api/webhooks/chatwoot-ai/route.ts`. Verify payload, check if `sender.id` matches AI Bot ID (prevent loop), map `inbox_id` to `workspace_id`, push to background queue.

**Task 2: Conversational Context & Dify Orchestration**
- Create `src/jobs/ai-orchestration.ts`.
- Fetch `ai_agent_configs`, fetch last 10 Chatwoot messages for context.
- Pass latest message through `redactPII()`. Map Chatwoot `conversation.id` to Dify `conversation_id`. Call Dify Chat API.

**Task 3: Response Routing & HITL**
- If confidence > 0.85, send as `outgoing` message via Chatwoot client.
- If confidence <= 0.85, add as `private_note` in Chatwoot and assign to human queue.
- Implement simulated typing delay before sending.

### [A] ACCEPTANCE
Address: Infinite loop prevention, Dify conversation mapping across channels, Media/Attachment handling (route to HITL if image/voice), and Background job idempotency.

**EXECUTION DIRECTIVE:** Begin with Task 1 and Task 2. Stop and wait for review.
```

#### 📋 Week 3 Prompt: Tool Connectivity & Function Calling
```text
Act as an Expert AI Architect. We are executing WEEK 3: Tool Connectivity & Function Calling. Giving the AI the ability to take action via Dify Custom Tools.

### [S] SITUATION
1. Secure Internal Tool Proxies: Build Next.js API routes as secure proxies to external systems.
2. OpenAPI Spec & Dify Registration: Generate OpenAPI specs and register in Dify.
3. Orchestration Updates: Handle intermediate AI messages ("Let me check...").
4. HITL Approval for "Write" Actions: Implement magic link approval for destructive actions.

### [C] CONTEXT
1. STRICT SECURITY: Proxies MUST use `INTERNAL_TOOL_SECRET` header. Validate inputs with `zod`.
2. READ vs. WRITE: "Read" (check order) is autonomous. "Write" (issue refund) requires HITL.

### [A] ACTION
**Task 1: Secure Internal Tool Proxies**
- Create `src/app/api/tools/check-order-status/route.ts` (Read).
- Create `src/app/api/tools/issue-refund/route.ts` (Write - returns `pending_approval`).

**Task 2: OpenAPI Spec & Registration**
- Create `src/lib/tools/openapi-specs.ts` with detailed OpenAPI 3.0 JSON.
- Create `src/actions/ai-register-tools.ts` to bind these specs to the Dify app.

**Task 3: Orchestration Updates & HITL**
- Update `src/jobs/ai-orchestration.ts` to parse intermediate text and send it to Chatwoot immediately.
- If `issue-refund` returns `pending_approval`, intercept and add a `private_note` to Chatwoot with a cryptographic "Approve Refund" magic link.

### [A] ACCEPTANCE
Address: Tool timeouts (10s limit), Hallucinated parameters (handle "Not Found"), Infinite tool loops (`max_tool_calls_per_turn` limit).

**EXECUTION DIRECTIVE:** Begin with Task 1 and Task 2. Stop and wait for review.
```

#### 📋 Week 4 Prompt: QA, Tuning & LLM-as-a-Judge
```text
Act as an Expert AI Architect. We are executing WEEK 4: QA, Tuning & The "LLM-as-a-Judge" Pipeline.

### [S] SITUATION
1. LLM-as-a-Judge: Background job to sample and evaluate AI conversations.
2. Human Feedback Loop: Capture human edits to calculate "Human Edit Rate".
3. AI Analytics Dashboard: Recharts dashboard for resolution rates and QA scores.

### [C] CONTEXT
1. COST CONTROL: LLM-as-a-Judge must sample only 5% of daily logs.
2. ZERO REGRESSION: Run QA pipeline completely asynchronously.

### [A] ACTION
**Task 1: Database Schema**
- Create `ai_evaluations` (accuracy_score, tone_score, hallucination_flag, judge_reasoning).
- Create `ai_feedback` (human_edited, similarity_score, final_message_text). Apply RLS.

**Task 2: LLM-as-a-Judge Pipeline**
- Create `src/jobs/ai-evaluation.ts`. Sample 5% of logs. Call secondary LLM with strict JSON evaluation prompt. Parse and insert into `ai_evaluations`.

**Task 3: Human Feedback Loop & Analytics**
- Listen to Chatwoot `message_updated` webhook. Compare original AI draft with final sent text. Calculate similarity score.
- Create `src/app/analytics/ai-performance/page.tsx` with Recharts widgets.

### [A] ACCEPTANCE
Address: LLM JSON parsing (regex cleanup for markdown), Empty data thresholds (skip if < 20 logs/day), Dashboard performance (SQL `date_trunc`).

**EXECUTION DIRECTIVE:** Begin with Task 1 and Task 2. Stop and wait for review.
```

#### 📋 Week 5 Prompt: Phased Rollout & Emergency Controls
```text
Act as an Expert SRE and AI Architect. We are executing WEEK 5: Phased Rollout, Traffic Routing, and Emergency Controls.

### [S] SITUATION
1. Canary Traffic Routing: Percentage-based traffic router.
2. Kill Switch & Cost Controls: Global stop mechanisms and hard daily token limits.
3. Observability: OpenTelemetry spans for AI jobs.

### [C] CONTEXT
1. PERFORMANCE: Routing/kill-switch checks must happen synchronously in the webhook listener *before* the background queue.
2. ZERO REGRESSION: If AI is disabled, message seamlessly falls to human agents.

### [A] ACTION
**Task 1: Traffic Routing & Kill Switch**
- Alter `ai_agent_configs`: add `traffic_allocation_percentage`, `daily_token_limit`, `is_globally_disabled`.
- Update webhook listener: Check kill switch. Hash `conversation_id` to 1-100 for consistent canary routing. Push to queue only if checks pass.

**Task 2: Cost Controls (Redis Token Limits)**
- Create `src/lib/ai/token-limiter.ts` using Redis keys `ai_tokens:{workspace_id}:{YYYY-MM-DD}` with 24h TTL.
- Update orchestration job: `checkLimit` before Dify API call. `incrementTokens` after.

**Task 3: Observability & Runbook**
- Add OpenTelemetry spans to `ai-orchestration.ts`. 
- Create `docs/AI_INCIDENT_RUNBOOK.md` with SQL commands for kill switches and Redis reset instructions.

### [A] ACCEPTANCE
Address: Redis failure fallback (fail closed to humans), Race conditions on canary roll (use conversation hash), Kill switch latency (secondary check inside background job).

**EXECUTION DIRECTIVE:** Begin with Task 1 and Task 2. Stop and wait for review.
```

---

# PART 3: Comprehensive QA Master Test Strategy

This section defines the end-to-end Quality Assurance strategy for the entire Nexus Social platform, validating functional correctness, enterprise security, and AI reliability.

### 1. Test Environment & Data
*   **Stack:** Playwright (E2E), Thunder Client (API), k6 (Load), Sentry (Errors).
*   **Accounts:** `admin@agency.com` (Owner), `editor@agency.com` (Editor), `client@brand.com` (Client), `admin@competitor.com` (Cross-tenant).

### 2. Core Test Scenarios (Selected Critical Paths)

| Test ID | Component | Business Context | Test Steps & Expected Outcome | Priority |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | Multi-Tenant RLS | Enterprise data isolation. | Query `posts` filtering by Competitor's `workspace_id`. **Expected:** 0 rows, 403 Forbidden. | **Critical** |
| **AI-01** | PII Redaction | GDPR/CCPA compliance. | Enter prompt with email/phone. Intercept Dify API request. **Expected:** Payload contains `[REDACTED]`. | **Critical** |
| **WA-01** | WhatsApp Webhook | Prevent unauthorized injection. | Send POST with missing/tampered `X-Hub-Signature-256`. **Expected:** 403 Forbidden. | **Critical** |
| **BILL-01**| Stripe & AI Credits| Prevent financial exploitation. | Trigger 11 concurrent AI generations with 10 credits. **Expected:** 11th blocked, credits never drop below 0. | **Critical** |
| **AI-02** | AI Kill Switch | Emergency stop & cost control. | Set `is_globally_disabled = true`. Send message. **Expected:** Routes 100% to human immediately. | **Critical** |
| **AI-03** | Tool Execution HITL | Secure backend actions. | Ask AI to "Issue refund". **Expected:** AI pauses. Chatwoot shows private note with Magic Link. Refund only executes after click. | **High** |
| **PORT-01**| Client Portal | Agency client isolation. | Login as Client (Brand X). Change `parent_client_id` in frontend state to Brand Y. **Expected:** 403 Forbidden via RLS. | **Critical** |

### 3. Load Testing (k6)
*   **PERF-01:** 50 VUs creating posts. *Threshold: p95 < 500ms.*
*   **PERF-02:** 200 VUs loading calendar. *Threshold: p95 < 300ms.*
*   **PERF-03:** 100 Chatwoot webhooks/sec (AI Orchestration). *Threshold: Queue depth < 500, PII redaction adds < 50ms latency.*

### 4. Launch Sign-Off Criteria
1. **100% Pass Rate** on all **Critical** test cases (RLS, PII, Webhooks, Kill Switch).
2. **Zero** open defects related to Multi-tenant data leakage or Payment processing.
3. **k6 Load Tests** pass all defined thresholds.
4. **AI Agent** processes 100 simulated messages with < 5% hallucination rate (verified by LLM-as-a-Judge).

---

# PART 4: Google Antigravity Execution Manual

To successfully build this massive platform using **Google Antigravity**, you must manage the AI's context window and execution flow meticulously. 

### 🧠 Rules for Antigravity
1. **Use the `@workspace` Tag:** Always use `@workspace` or `@folder` in your prompts so Antigravity has full context of the files it previously generated.
2. **Enforce the "Stop" Directive:** The SCADA prompts explicitly tell the agent to "Stop after Task 2 and wait for review." **Do not skip this.** Let the agent finish, review the code, test it, and then say *"Proceed to Task 3"*. If you let it run all tasks at once, it will truncate the code or hallucinate imports.
3. **Handle Context Limits:** If Antigravity stops generating mid-code, simply reply: *"Continue exactly where you left off, maintaining the exact same file structure and logic."*
4. **Error Correction:** If a build fails, copy the *exact* terminal error and paste it back with: *"Fix this specific error. Do not change the working parts of the code."*
5. **Database First:** Always run the SQL scripts provided by the agent in your Supabase SQL Editor *before* testing the frontend. 90% of "frontend bugs" in this stack are actually missing database tables or RLS policies.

### 🚀 Execution Sequence
1. **Initialize Environment:** Run the Docker/VS Code setup scripts to get Supabase, Dify, Chatwoot, and Activepieces running locally.
2. **Sprints 1-11:** Feed the AI the context for the Core SaaS platform. Execute Sprint by Sprint.
3. **Weeks 1-5:** Once the SaaS shell is stable, feed it the **Week 1 AI Prompt**. Execute Week by Week.
4. **QA & Load Testing:** Once Week 5 is complete, feed it the QA Test Strategy to generate the Playwright and k6 scripts.
5. **Launch:** Run the load tests, verify the Sentry logs, flip the canary routing to 100%, and go live.

***

**You now possess the complete, battle-tested blueprint, codebase architecture, QA strategy, and execution manual for Nexus Social. You are ready to build.**
