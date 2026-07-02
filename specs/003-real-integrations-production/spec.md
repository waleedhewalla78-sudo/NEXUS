# Feature Specification: Real Integrations & Production Readiness

> **Consolidated spec (2026-06-23):** Canonical folder `specs/003-real-integrations-production/`. User stories and FR-001–FR-040 from `speckit.specify` (session 2b0267ba). Implementation plan, research, data model, quickstart, and completed task status merged from `specs/003-production-saas/` (sessions 58150af0, 12e4f8f2). Deprecated duplicate: `specs/003-production-saas/README.md`.

**Feature Branch**: `003-real-integrations-production`

**Created**: 2026-06-23

**Status**: Launch-ready pending operator OAuth UAT (T053) and Meta App Review (T057) — **60/62 tasks complete (97%)**; automated gates green (`npm run phase4:uat`: typecheck, 115 unit + 17 integration tests, schema 18/18, build). See [LAUNCH_CHECKLIST.md](../../nexus-social-app/LAUNCH_CHECKLIST.md), [testing-plan.md](./testing-plan.md), and [tasks.md](./tasks.md).

**Qwen Phase 2 source (2026-06-23):** [AI-Powered Social Media Platform Blueprint](https://chat.qwen.ai/s/t_068e14e9-a429-452c-86b7-520a16787e79?fev=0.2.66) — **content not extractable** (mobile-app landing page only). Phase 2 verification below is from code audit vs FR-009–FR-025 and tasks T025–T038.

### Implementation Progress (2026-06-23 launch audit)

| Phase | Complete | Notes |
|-------|----------|-------|
| Phase 0 Preflight | 4/4 | OAuth env docs, Meta review flag, ai:verify gate, getAnalytics tests |
| Phase 1 | 19/20 | T024 Playwright publish E2E deferred; smoke health/login E2E exists |
| Phase 2 | 14/14 | Analytics, docker, token refresh |
| Phase 3 | 14/14 | Reputation, AI tools, UX table stakes |
| Phase 4 Validation | 0/5 live | Manual UAT documented; CI workflows ready |

### Phase 2 verification (2026-06-23 code audit)

Qwen blueprint URL returned a mobile-app landing page only — no new requirements extracted. Audit of implemented Phase 2 (T025–T038) vs FR-009–FR-025:

| Area | Status | Evidence |
|------|--------|----------|
| `post_analytics` migration + RLS | ✅ | `20260623_000005_post_analytics.sql`, `20260623_000007_analytics_rpc.sql` |
| Insights fetchers (Meta/LinkedIn/X) | ✅ | `src/lib/analytics/{meta,linkedin,x}-insights.ts`, `registry.ts` |
| LinkedIn insights API | ✅ Fixed T059 | `organizationalEntityShareStatistics` endpoint (was wrong `socialActions` path) |
| Multi-platform external post IDs | ✅ Fixed T058 | Per-platform IDs recorded in `post_analytics` at publish; sync resolves per platform |
| Analytics sync worker (6h) | ✅ | `src/jobs/sync-analytics.ts`, `worker.ts` loop |
| Production demo fallback removed | ✅ | `getAnalytics.ts` throws in prod; `DEMO_ANALYTICS_ENABLED=false` |
| Report builder ingested-only | ✅ Fixed T061 | Empty states when no `engagement` data (no post-count fallback) |
| Full-stack Docker compose | ✅ | Root `docker-compose.full-stack.yml` (web + worker + redis + optional integrations) |
| Health: worker + schema | ✅ Fixed T060 | `/api/health` marks overall `down` in prod when worker heartbeat missing and publishing enabled |
| Token refresh worker (1h) | ✅ | `src/jobs/refresh-tokens.ts`, compose env documented T062 |
| Walkthrough script | ✅ Fixed T062 | `full-walkthrough.ps1` starts redis + web + worker from full-stack compose |

**Remaining Phase 2 validation (manual):** T055 ingestion → dashboard smoke; T056 full-stack E2E with live Supabase + OAuth sandbox.

**Blockers remaining:** Meta App Review (T057); Playwright publish E2E (T024); live OAuth UAT (T053) requires operator credentials.

**Input**: User description: "Close the demo-to-production gap (Potemkin Village): real social publishing, analytics ingestion, schema/DevOps automation, full-stack orchestration, reputation, AI agent reliability, and competitor-grade UX—prioritizing backend integrations before new UI surfaces."

## Product Vision & Problem Statement

Nexus Social Platform presents as ~70% demo-ready: calendars, previews, analytics charts, and AI-assisted workflows render convincingly in walkthroughs. Underneath, critical paths still simulate success—social accounts store handles in workspace branding JSON rather than OAuth tokens; scheduled posts flip to "published" without reaching Meta, LinkedIn, or X; analytics fall back to seeded demo data when RPCs or tables are missing (PGRST205); Dify workflows may be unpublished; reputation tables may not exist in the live schema.

This **Potemkin Village** gap erodes trust with agency buyers who expect Buffer-, Hootsuite-, Vista Social-, or Sprout Social-grade reliability on day one. The strategic mandate from expert review is explicit: **no new mobile apps, dashboards, or net-new UI features until Epic 1 (Real Publishing) and Epic 3 (DevOps & Schema Automation) are production-verified.** Meta App Review is a business gate for Facebook/Instagram publishing—not an engineering shortcut.

### Current Blockers (June 2026 Status)

| Blocker | Impact |
|--------|--------|
| Schema PGRST205 / missing tables | Reputation, team invites, SSO, analytics RPC fail silently or degrade |
| Dify app not published | AI caption, inbox agent, and tool proxies fail at runtime |
| No real social publishing | Scheduled posts never reach external networks |
| Demo analytics fallback | Dashboards show fabricated KPIs in non-production environments |
| Manual Supabase SQL | Migrations drift; PostgREST cache stale after DDL |
| Fragmented docker stacks | No single compose for app + worker + Redis + Supabase + integrations |

## Competitor Table Stakes Gap Analysis

Capabilities users expect from Vista Social, Buffer, Hootsuite, and Sprout Social that Nexus must match before claiming production readiness:

| Table stake | Competitors | Nexus today | Target (this spec) |
|-------------|-------------|-------------|-------------------|
| OAuth-connected social accounts | Full OAuth per network | Manual handle/URL fields | Epic 1 |
| Reliable scheduled publishing | Queue + retry + failure visibility | Status flip only | Epic 1 |
| Cross-network post composer | Platform-specific limits enforced | Preview-only validation | Epic 1 + Phase 3 UX |
| Unified calendar with publish states | Live sync with network IDs | Local DB states only | Epic 1 |
| Post-level performance metrics | Impressions, clicks, engagement rate | Demo RPC / fallback data | Epic 2 |
| Reporting export | PDF/CSV from real metrics | Widgets on demo data | Epic 2 + Phase 3 |
| Inbox + social in one workspace | Native or integrated | Chatwoot path exists; publishing separate | Epic 1 + existing inbox |
| Brand/competitor listening | Sprout/Hootsuite listening | Reputation UI; schema often missing | Phase 3 reputation |
| AI caption & reply assist | Add-ons / native AI | Dify-dependent; publish gate | Phase 3 AI |
| Team roles & approvals | Standard on all tiers | Partial; schema gaps | Epic 3 schema + existing roles |
| White-label / client portals | Enterprise tiers | Scaffolded | Out of near-term scope |
| Mobile app | All major competitors | Parallel track documented | **Out of scope** |

## Phasing & Priority

| Phase | Epics / themes | Goal |
|-------|----------------|------|
| **Phase 1** (P1) | Epic 1 Real Publishing + Epic 3 DevOps & Schema | End Potemkin publishing; automated schema; CI gate |
| **Phase 2** (P2) | Epic 2 Real Analytics + Epic 4 Full-Stack Docker | Truthful metrics; one-command local/staging stack |
| **Phase 3** (P3) | Reputation + AI agent + UX table stakes | Differentiation after integrations are real |

## Out of Scope (Near Term)

- Native mobile app (`nexus-mobile` remains a parallel track only)
- New executive dashboards or analytics product surfaces beyond wiring real data to existing pages
- Net-new UI features unrelated to OAuth connect, publish status, or error surfacing
- Enterprise SSO expansion beyond schema stability fixes
- White-label custom domains beyond maintenance of existing scaffold
- Meta/Instagram publishing **before** Meta App Review approval (engineering may complete integration; go-live blocked on business approval)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - OAuth Social Account Connection (Priority: P1 · Epic 1)

As a social media manager, I want to connect Meta, LinkedIn, and X accounts through official OAuth flows, so that the platform can publish on my behalf without storing fake "connected" flags from manual URLs.

**Why this priority**: Without real tokens, every downstream publish, analytics, and reputation feature is cosmetic.

**Independent Test**: Complete OAuth for each supported network in a test workspace; verify tokens are stored encrypted per workspace, revocable, and scoped to the selected page/profile.

**Acceptance Scenarios**:

1. **Given** a manager opens Publishing channels settings, **When** they click Connect for LinkedIn, **Then** they complete OAuth and see a verified connected state with account display name.
2. **Given** a connected Meta account pending App Review, **When** the manager views connection status, **Then** they see a clear "pending approval" state—not a false "ready to publish."
3. **Given** a manager revokes access from the network's side, **When** they next attempt to publish, **Then** the platform prompts re-authentication without crashing the scheduler.

---

### User Story 2 - Real Scheduled Publishing (Priority: P1 · Epic 1)

As a social media manager, I want scheduled posts to publish to the selected networks at the scheduled time, so that clients see content live on their profiles—not only inside Nexus.

**Why this priority**: Publishing is the core agency workflow and the primary demo-to-production gap.

**Independent Test**: Schedule a post 2 minutes ahead for a sandbox LinkedIn/X test account; confirm the live post URL is stored and status is `published` or `failed` with reason.

**Acceptance Scenarios**:

1. **Given** a scheduled post with valid OAuth tokens, **When** the publish time arrives, **Then** a background worker publishes via the network adapter and records the external post ID.
2. **Given** a network API rate limit or transient error, **When** publish fails, **Then** the worker retries with backoff and marks `failed` with user-visible error after max attempts.
3. **Given** a multi-network post, **When** one network succeeds and another fails, **Then** per-platform status is shown independently.

---

### User Story 3 - Publishing Adapter Extensibility (Priority: P1 · Epic 1)

As a platform engineer, I want a unified publishing adapter interface with per-network implementations, so that adding TikTok or YouTube later does not rewrite the scheduler.

**Why this priority**: Expert architecture requires PublisherAdapter + worker separation before scaling networks.

**Independent Test**: Implement or mock two adapters; run the worker against both in a single job batch without duplicate scheduling logic.

**Acceptance Scenarios**:

1. **Given** a new network adapter registered, **When** a post targets that platform, **Then** the worker invokes only that adapter's publish and validate methods.
2. **Given** invalid media for a platform's rules, **When** validation runs pre-publish, **Then** the post is blocked with validation errors before any API call.

---

### User Story 4 - Automated Schema Migrations (Priority: P1 · Epic 3)

As a developer, I want database schema changes applied through versioned migrations with Supabase CLI, so that reputation, analytics, and team tables exist consistently in every environment.

**Why this priority**: PGRST205 and missing tables block reputation, analytics RPC, invites, and SSO—manual SQL caused drift.

**Independent Test**: Clone a fresh environment, run the migration pipeline, execute `verify-schema` with zero PGRST205 errors.

**Acceptance Scenarios**:

1. **Given** a new migration file in the repo, **When** CI runs on a pull request, **Then** migrations apply cleanly to a ephemeral database and schema check passes.
2. **Given** migrations applied to staging, **When** PostgREST reload runs, **Then** new tables are queryable without manual dashboard SQL.
3. **Given** a developer follows README migration order, **When** they bootstrap locally, **Then** all features in Phase 1–2 specs find required tables.

---

### User Story 5 - CI Schema Gate & PostgREST Reload (Priority: P1 · Epic 3)

As a release manager, I want CI to fail when schema and application code drift, so that demo-breaking PGRST205 errors never reach staging again.

**Why this priority**: Schema cache staleness is a recurring production incident class.

**Independent Test**: Introduce a deliberate missing table in a branch; confirm CI schema job fails; fix and confirm pass.

**Acceptance Scenarios**:

1. **Given** application code references a table, **When** that table is absent from migrations, **Then** CI schema verification fails with an actionable message.
2. **Given** a successful deploy, **When** DDL has changed, **Then** automated PostgREST schema reload runs before traffic shifts.

---

### User Story 6 - Real Post Analytics Ingestion (Priority: P2 · Epic 2)

As an agency analyst, I want impressions, clicks, and engagement stored per published post, so that reports reflect actual network performance—not demo constants.

**Why this priority**: Analytics credibility follows real publishing; depends on Epic 1 external post IDs.

**Independent Test**: After a published post, run analytics ingestion; confirm `post_analytics` rows match network API samples within tolerance.

**Acceptance Scenarios**:

1. **Given** a published post with an external ID, **When** ingestion runs, **Then** metrics are persisted to post-level analytics storage keyed by workspace.
2. **Given** analytics API returns delayed metrics, **When** ingestion re-runs on schedule, **Then** values update without duplicating rows.
3. **Given** a workspace with no published posts, **When** the analytics page loads, **Then** zero states display—not demo fallback data in production.

---

### User Story 7 - Insights Polling & Dashboard Truth (Priority: P2 · Epic 2)

As a workspace owner, I want dashboards and report builder widgets to read ingested insights on a polling cadence, so that I can trust KPI trends in client meetings.

**Why this priority**: Removes demo analytics fallback; completes the "show real ROI" story.

**Independent Test**: Disable demo fallback flag; verify analytics page and report builder show only ingested data or explicit empty/error states.

**Acceptance Scenarios**:

1. **Given** ingested post analytics exist, **When** a user opens Analytics, **Then** totals match summed post-level metrics for their workspace only.
2. **Given** the insights cron runs hourly, **When** networks publish updated metrics, **Then** dashboard aggregates refresh within the next cycle.
3. **Given** ingestion failure for one network, **When** the user views analytics, **Then** partial data is shown with a visible degradation notice—not fabricated numbers.

---

### User Story 8 - Full-Stack Local & Staging Orchestration (Priority: P2 · Epic 4)

As a developer or solutions engineer, I want one Docker Compose stack that boots the app, worker, Redis, observability, and integration dependencies, so that demos and QA run against a consistent full stack.

**Why this priority**: Fragmented compose files caused walkthrough fragility and hidden missing services.

**Independent Test**: Run `docker-compose.full-stack.yml` (or documented equivalent); complete login, schedule post, worker publish, and analytics ingestion smoke test.

**Acceptance Scenarios**:

1. **Given** a clean machine with Docker, **When** the developer starts the full-stack compose profile, **Then** app, worker, and Redis reach healthy status without manual port hunting.
2. **Given** the stack is running, **When** walkthrough script executes, **Then** health checks pass for app API, worker queue, and database connectivity.
3. **Given** an integration service is intentionally stopped, **When** health is queried, **Then** dependent features report degraded status in `/api/health`.

---

### User Story 9 - Reputation & Competitive Listening (Priority: P3)

As a brand manager, I want to monitor our own social mentions and selected competitor profiles across the web and social networks, so that I can respond to sentiment shifts and benchmark share of voice.

**Why this priority**: Strategic differentiator after publishing and analytics are truthful; requires stable schema (Epic 3).

**Independent Test**: Add competitor domains and owned handles; ingest sample mentions; verify reputation dashboard lists rows scoped to workspace without PGRST205.

**Acceptance Scenarios**:

1. **Given** configured competitor websites and social handles, **When** ingestion runs, **Then** new mentions appear with source, sentiment, and timestamp.
2. **Given** a mention on an owned channel, **When** viewed in reputation inbox, **Then** the manager can link to response actions without cross-tenant leakage.
3. **Given** reputation tables were missing before migration, **When** Epic 3 migrations are applied, **Then** reputation pages load without schema cache errors.

---

### User Story 10 - AI Agent for Operations & Market Analysis (Priority: P3)

As an agency operator, I want the AI agent to analyze our workspace data and relevant market signals with published Dify workflows, so that managers get actionable recommendations—not errors from unpublished apps.

**Why this priority**: AI is strategic but depends on real data (Epics 1–2) and Dify publish gate.

**Independent Test**: Run `ai:verify`; ask agent for weekly performance summary; confirm response uses workspace analytics and cites data sources.

**Acceptance Scenarios**:

1. **Given** Dify app is published and keyed per workspace, **When** a manager requests a performance summary, **Then** the agent returns insights grounded in ingested analytics—not demo fallbacks.
2. **Given** market analysis is enabled, **When** the agent compares client metrics to configured competitors, **Then** outputs distinguish first-party vs third-party sources.
3. **Given** Dify is unreachable, **When** AI features are invoked, **Then** users see a clear error and human workflows remain available.

---

### User Story 11 - Competitor-Grade UX Table Stakes (Priority: P3)

As an agency user familiar with Buffer or Hootsuite, I want calendar, composer, and connect flows to match industry-standard interaction patterns, so that Nexus feels professional—not a prototype.

**Why this priority**: UX polish without real backend would repeat Potemkin patterns; executed only after Phase 1–2.

**Independent Test**: Heuristic review against competitor flows for connect OAuth, calendar drag-reschedule, composer character limits, and publish failure surfacing.

**Acceptance Scenarios**:

1. **Given** a failed publish, **When** the user opens the calendar event, **Then** they see error detail and a retry or re-auth action.
2. **Given** the composer, **When** text exceeds a platform limit, **Then** inline validation prevents scheduling until corrected.
3. **Given** OAuth connect success, **When** returning to settings, **Then** connection state updates without full page reload.

---

### Edge Cases

- **Meta App Review pending**: Instagram/Facebook publish attempts must fail gracefully with business-blocker messaging, not silent success.
- **Token expiry mid-queue**: Worker must mark post failed and notify; must not infinite-retry auth errors.
- **Partial multi-network publish**: Status per platform; no single boolean "published" masking failures.
- **Analytics lag**: Networks may delay metrics 24–72h; UI must tolerate stale timestamps without fabricating data.
- **Schema migration rollback**: Failed deploy must not leave PostgREST serving half-applied DDL.
- **Dify unpublished mid-demo**: Caption and agent features degrade with operator-visible banner tied to `ai:verify`.
- **Reputation ingestion rate limits**: Backoff and partial ingest; never block publishing worker on listening failures.

## Requirements *(mandatory)*

### Functional Requirements — Epic 1: Real Publishing Engine

- **FR-001**: System MUST connect Meta (Facebook/Instagram), LinkedIn, and X accounts via OAuth 2.0 with workspace-scoped token storage and refresh handling.
- **FR-002**: System MUST implement a unified PublisherAdapter contract with network-specific implementations for validate, publish, and token health check operations.
- **FR-003**: System MUST enqueue due scheduled posts to a publish worker that executes outside the web request path with idempotent job processing.
- **FR-004**: System MUST persist external network post IDs and permalinks on successful publish for downstream analytics linkage.
- **FR-005**: System MUST surface per-platform publish status (`scheduled`, `publishing`, `published`, `failed`) with user-visible failure reasons.
- **FR-006**: System MUST retry transient publish failures with exponential backoff and a configurable maximum attempt count.
- **FR-007**: System MUST block publish when OAuth tokens are missing, expired, or network is pending business approval (Meta App Review).
- **FR-008**: System MUST enforce platform-specific content rules (length, media type, aspect ratio) before enqueueing publish jobs.

### Functional Requirements — Epic 2: Real Analytics Ingestion

- **FR-009**: System MUST store post-level analytics (impressions, reach, clicks, engagements as available per network) in dedicated post analytics storage keyed by workspace and external post ID.
- **FR-010**: System MUST run scheduled insights polling to fetch updated metrics for all published posts with valid tokens.
- **FR-011**: System MUST aggregate ingested post analytics for workspace dashboards and report builder widgets without demo fallback data in production.
- **FR-012**: System MUST update existing analytics rows on re-poll rather than creating unbounded duplicates.
- **FR-013**: System MUST expose empty and partial-data states when ingestion has not run or a network is unavailable.
- **FR-014**: System MUST restrict analytics queries to workspace members via existing tenancy rules.

### Functional Requirements — Epic 3: DevOps & Schema Automation

- **FR-015**: System MUST manage all application tables through ordered, versioned SQL migrations checked into the repository.
- **FR-016**: System MUST provide Supabase CLI-compatible migration workflow documented for local, staging, and production apply paths.
- **FR-017**: CI MUST run automated schema verification (including detection of PGRST205-class missing relation errors) on every pull request touching schema or data access layers.
- **FR-018**: Deploy pipeline MUST reload PostgREST schema cache after successful migration apply before serving traffic.
- **FR-019**: System MUST include migrations for reputation, team management, SSO, analytics RPC dependencies, and post analytics tables required by Phases 1–3.
- **FR-020**: Developers MUST have a single documented migration apply script aligned with README ordering.

### Functional Requirements — Epic 4: Full-Stack Docker Orchestration

- **FR-021**: Repository MUST provide a full-stack Docker Compose profile bundling application, publish worker, Redis queue, and documented integration endpoints.
- **FR-022**: Full-stack compose MUST wire environment variables for Supabase, OAuth client IDs, Dify, and Chatwoot per existing `.env.example` conventions.
- **FR-023**: Health endpoints MUST report worker queue connectivity and schema readiness as part of overall platform health.
- **FR-024**: Walkthrough and smoke scripts MUST target the full-stack compose profile as the canonical demo path.
- **FR-025**: Compose documentation MUST state which services are optional vs required for Phase 1 vs Phase 2 validation.

### Functional Requirements — Reputation

- **FR-026**: System MUST allow workspace admins to configure owned social handles and competitor websites/profiles for monitoring.
- **FR-027**: System MUST ingest mentions and reputation signals into workspace-scoped storage with source metadata and timestamps.
- **FR-028**: System MUST present reputation dashboards and alerts without schema-missing errors after Epic 3 migrations are applied.
- **FR-029**: System MUST keep reputation ingestion failures isolated from publish worker availability.

### Functional Requirements — AI Agent

- **FR-030**: System MUST verify Dify app publish state (`ai:verify`) as a preflight gate for AI caption, inbox agent, and analytics Q&A features.
- **FR-031**: System MUST use workspace-scoped Dify keys and knowledge datasets for all AI responses (no cross-tenant context).
- **FR-032**: AI agent MUST support operational queries over ingested first-party analytics (post counts, engagement trends, optimal times).
- **FR-033**: AI agent MUST support market-aware analysis when competitor and reputation data are configured, clearly labeling third-party sources.
- **FR-034**: System MUST degrade AI features gracefully when Dify is unpublished or unreachable, preserving human inbox and manual workflows.
- **FR-035**: System MUST NOT use demo analytics fallback data as AI grounding context in production.

### Functional Requirements — UX Table Stakes

- **FR-036**: OAuth connect flows MUST follow standard redirect, success, and error patterns consistent with major SMM tools.
- **FR-037**: Calendar MUST display accurate per-platform publish states and allow retry/reschedule from failed events.
- **FR-038**: Composer MUST show per-platform character/media validation before scheduling.
- **FR-039**: Settings MUST distinguish "profile URL only" legacy entries from OAuth-connected accounts during migration.
- **FR-040**: Error toasts and inline banners MUST replace silent failures for publish, analytics, and AI operations.

### Non-Functional Requirements

- **NFR-001** (Security): OAuth tokens and refresh tokens MUST be encrypted at rest and never logged in plaintext.
- **NFR-002** (Security): Publish and analytics workers MUST enforce workspace isolation on every job payload.
- **NFR-003** (Reliability): Publish worker MUST process at-least-once with idempotency keys to prevent duplicate live posts.
- **NFR-004** (Reliability): Platform target availability for scheduling UI is 99.5% monthly excluding third-party network outages.
- **NFR-005** (Performance): OAuth connect round-trip SHOULD complete within 60 seconds under normal network conditions.
- **NFR-006** (Performance): Analytics dashboard SHOULD load ingested aggregates within 3 seconds for workspaces with up to 10,000 posts.
- **NFR-007** (Observability): Publish and ingestion failures MUST emit structured logs and error tracking events with workspace and post IDs.
- **NFR-008** (Operability): Schema CI failure messages MUST identify missing tables or RPCs by name within one log line.
- **NFR-009** (Compliance): Meta/Instagram features MUST remain disabled for production publish until Meta App Review approval is recorded in workspace settings.
- **NFR-010** (Maintainability): New network adapters MUST be addable without modifying scheduler core logic—only adapter registration.

### Key Entities

- **OAuth Connection**: Workspace-scoped record of network, token set, expiry, connected profile/page IDs, and approval status flags.
- **Scheduled Post**: Content, media, target platforms, schedule time, per-platform status, external IDs, and last error.
- **Publish Job**: Idempotent queue entry referencing scheduled post, attempt count, and next retry time.
- **Publisher Adapter**: Pluggable network implementation exposing validate/publish/health operations.
- **Post Analytics**: Time-series metrics row linked to external post ID, platform, and workspace.
- **Insights Sync Run**: Cron execution metadata (started, completed, rows updated, errors by network).
- **Schema Migration**: Versioned DDL unit applied in order with checksum tracked by CI.
- **Reputation Target**: Owned or competitor handle/domain configured for monitoring.
- **Mention**: Ingested reputation event with source, sentiment, URL, and workspace scope.
- **AI Workspace Config**: Dify app key, dataset IDs, publish verification timestamp, and feature toggles.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of scheduled posts in Phase 1 UAT publish to sandbox LinkedIn and X accounts or fail with explicit, user-visible errors—zero silent "published" states.
- **SC-002**: OAuth connect success rate ≥ 95% for LinkedIn and X in staging across 20 consecutive test connections.
- **SC-003**: Zero PGRST205 errors in `verify-schema` and CI schema gate on main branch after Epic 3 completion.
- **SC-004**: Production analytics pages show demo fallback data in 0% of requests when ingested data exists (verified by automated smoke test).
- **SC-005**: Post analytics ingestion updates at least 90% of published posts within 24 hours of network metric availability.
- **SC-006**: Full-stack compose walkthrough completes login → schedule → publish → analytics smoke in under 30 minutes on a fresh clone (documented runbook).
- **SC-007**: Meta publish remains feature-flagged until App Review approval field is set; 100% of pre-approval publish attempts are blocked with business-appropriate messaging.
- **SC-008**: Dify `ai:verify` passes in staging before AI features are marked enabled for demo accounts.
- **SC-009**: Reputation dashboard loads with seeded mentions in 100% of workspace tests after migrations—no schema cache errors.
- **SC-010**: UX heuristic review scores Phase 3 calendar/composer/connect flows at parity with table stakes checklist (≥ 8/10 items passing) before marketing claims "production ready."

## Dependencies & Business Blockers

| Dependency / blocker | Type | Mitigation |
|---------------------|------|------------|
| Meta App Review | Business | Complete Meta developer app submission; gate Instagram/Facebook publish behind approval flag until granted |
| OAuth app registrations (Meta, LinkedIn, X) | External | Register apps with redirect URIs for staging and production |
| Supabase project access | Infrastructure | CLI linked project; service role for migrations; anon key for app |
| Dify Cloud app publish | External | Publish workflow; per-workspace API keys in `ai_agent_configs` |
| Epic 1 before Epic 2 | Technical | External post IDs required for analytics ingestion |
| Epic 3 before reputation/SSO/analytics RPC | Technical | Apply migrations before enabling reputation and team features |
| Feature 001 production hardening | Prerequisite | Queue consumer, webhook auth, billing atomicity remain baseline (see `specs/001-production-readiness-hardening/`) |
| Feature 002 product vision | Parent context | Multi-tenant workspace model and user journeys defined in `specs/002-nexus-social-platform/` |

## Assumptions

- Primary validation networks for Phase 1 are LinkedIn and X; Meta added immediately after App Review.
- Sandbox/test accounts exist for each network prior to UAT sign-off.
- Supabase remains the system of record; PostgREST exposes app queries.
- Redis-backed worker pattern from feature 001 extends to publish and analytics cron jobs.
- Demo analytics fallback remains acceptable only in local dev when `NODE_ENV !== 'production'` and Supabase is unconfigured—never in staging/production after Epic 2.
- UX Phase 3 refines existing pages (calendar, composer, settings, analytics)—no new dashboard products.
- Chatwoot and Dify remain integration boundaries; Nexus orchestrates rather than reimplements inbox or LLM hosting.

## Related Specifications

- **001-production-readiness-hardening**: Background workers, HMAC approvals, API gateway, telemetry baseline.
- **002-nexus-social-platform**: Full product vision, multi-tenant journeys, enterprise roadmap.
- **003-real-integrations-production** (this document): Demo-to-production bridge for publishing, analytics, schema, orchestration, reputation, AI, and UX table stakes. Implementation artifacts: [plan.md](./plan.md), [research.md](./research.md), [data-model.md](./data-model.md), [quickstart.md](./quickstart.md).
