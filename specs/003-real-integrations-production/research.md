# Research: Real Integrations & Production Readiness



Consolidates architecture choices for feature `003-real-integrations-production` (2026-06-23).



> Merged from `specs/003-production-saas/research.md`.



---



## Decision 1: PublisherAdapter Pattern



**Decision:** Abstract `PublisherAdapter` interface with platform-specific implementations (`MetaPublisher`, `LinkedInPublisher`, `XPublisher`).



**Rationale:** `scripts/publish-facebook-post.ts` already implements Meta feed/photo publish. Extracting to a class enables worker reuse, unit testing with mocked fetch, and consistent error mapping to `publish_error`.



**Alternatives considered:**

- *Direct script invocation from worker:* Rejected — no multi-platform abstraction, hard to test.

- *Activepieces as publish orchestrator:* Rejected — adds latency and external dependency for core SMM path.



---



## Decision 2: Redis Worker Cron vs BullMQ



**Decision:** Extend existing `src/bin/worker.ts` with `setInterval` loops for publish (60s) and analytics (6h), alongside existing AI BRPOP consumer.



**Rationale:** 001/002 research rejected BullMQ for simple FIFO. Publish polling is low-frequency; no need for job persistence/retry UI yet. Use DB status + optional `post_publish_attempts` for retry audit.



**Alternatives considered:**

- *BullMQ:* Deferred — revisit if retry complexity or multi-worker coordination needed.

- *Vercel Cron:* Rejected — serverless timeout; Graph API calls can exceed limits.



---



## Decision 3: OAuth Token Storage



**Decision:** New table `workspace_social_connections` with AES-256-GCM encrypted `access_token` and `refresh_token` columns; encryption key from `TOKEN_ENCRYPTION_KEY` env.



**Rationale:** Tokens in `workspaces.branding` JSON are plaintext, unqueryable, and mixed with display metadata. Dedicated table enables expiry queries, RLS, and worker access without parsing JSON.



**Alternatives considered:**

- *Supabase Vault:* Viable for cloud; self-hosted CE may lack it — app-layer encryption is portable.

- *External secrets manager (AWS SM):* Deferred — adds ops complexity for MVP.



---



## Decision 4: Meta Graph API Version



**Decision:** Pin to **v21.0** (configurable via `FACEBOOK_GRAPH_API_VERSION`).



**Rationale:** Already used in `publish-facebook-post.ts`. v21 supports Page feed, photos, and insights endpoints needed for Epic 1+2.



**Alternatives considered:**

- *Unversioned Graph URL:* Rejected — breaking changes without notice.



---



## Decision 5: Analytics Source of Truth



**Decision:** `post_analytics` table populated by worker sync from platform Insights APIs; dashboard reads aggregated view joining posts + analytics.



**Rationale:** Platform APIs are authoritative for impressions/engagement. Local counts (scheduled vs published) remain in RPC but engagement metrics come from sync.



**Alternatives considered:**

- *Real-time webhook insights:* Not available uniformly across Meta/LinkedIn/X — polling is industry standard (Buffer/Hootsuite use scheduled sync).



---



## Decision 6: Schema Consolidation Strategy



**Decision:** Baseline migration from `essential_bootstrap.sql` + incremental numbered migrations; deprecate root-level `*_schema.sql` for new changes.



**Rationale:** Single `sprint12_competitive_gaps.sql` in `supabase/migrations/` proves CLI path works. PGRST205 on `listening_queries`/`external_reviews` indicates tables exist in patch files but not applied.



**Alternatives considered:**

- *Continue manual SQL Editor:* Rejected — caused current drift.



---



## Decision 7: PostgREST Reload



**Decision:** Final migration file executes `NOTIFY pgrst, 'reload schema';` after DDL.



**Rationale:** Supabase hosted PostgREST caches schema; without NOTIFY, new tables 404 until manual reload.



---



## Decision 8: Full-Stack Docker Topology



**Decision:** Root-level `docker-compose.full-stack.yml` with `nexus-internal` bridge network; services reference each other by compose service name.



**Rationale:** Chatwoot, Dify, Activepieces live in sibling directories — compose file at monorepo root can `build: ./chatwoot` etc. Matches expert Epic 4 spec.



**Alternatives considered:**

- *Kubernetes:* Rejected for near-term — agency staging uses Compose.



---



## Decision 9: Reputation Ingestion



**Decision:** Phase 3 worker jobs — Meta mention search where API allows; Google Places Reviews API for `external_reviews`; configurable scraper fallback behind feature flag for competitor websites.



**Rationale:** `reputation.ts` already queries tables; ingestion is the missing piece. Start with APIs with clear ToS; scraping is last resort.



---



## Decision 10: AI Market Analysis



**Decision:** Extend Dify tool proxies to query Supabase (`post_analytics`, `mentions`) via internal HTTP; OpenRouter fallback only when Dify unreachable.



**Rationale:** Keeps tenant isolation in Nexus layer; Dify handles reasoning/RAG. Aligns with 002 `ai-tool-proxies.md` contract pattern.



---



## Decision 11: UX Phase Timing



**Decision:** Incremental polish pass in Phase 3 only — calendar DnD, composer preview, chart labels — no new routes or mobile.



**Rationale:** Expert analysis: new UI before backend = extended Potemkin risk.



---



## Decision 12: Meta App Review Handling



**Decision:** Document sandbox vs production modes; dev/staging uses test Page tokens; production Instagram requires completed App Review.



**Rationale:** Business blocker outside engineering control — plan must not assume instant Meta production access.



---



## Decision 13: Multi-Platform External Post IDs



**Decision:** Record per-platform `external_post_id` in `post_analytics` at publish time; analytics sync resolves the ID per platform from that table (fallback: `posts.external_post_id` for single-platform legacy rows).



**Rationale:** `posts.external_post_id` holds only the last platform's ID when a post targets multiple networks. Reusing it for every platform in sync-analytics caused wrong or failed insights fetches.



**Alternatives considered:**

- *JSONB `platform_results` on posts:* Rejected — requires migration; `post_analytics` already keyed by `(post_id, platform, external_post_id)`.



---



## References



- Existing publish proof: `nexus-social-app/scripts/publish-facebook-post.ts`

- Demo analytics gap: `nexus-social-app/src/actions/getAnalytics.ts` (`DEMO_ANALYTICS`)

- Worker pattern: `nexus-social-app/src/bin/worker.ts`

- Reputation reads: `nexus-social-app/src/actions/reputation.ts`

- Prior plans: `specs/002-nexus-social-platform/research.md`, `specs/001-production-readiness-hardening/research.md`


