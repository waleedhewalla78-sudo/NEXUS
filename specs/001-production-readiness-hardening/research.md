# Research: Nexus Social Platform Decisions

Technical decisions for Track A (production hardening) and Track B (SMM product completion).

---

## Track A — Production Hardening

### Decision 1: Queue Consumer Daemon
- **Selected**: Standalone TypeScript daemon with Redis `BRPOP` in `src/bin/worker.ts`
- **Rationale**: Lightweight FIFO without BullMQ overhead
- **Alternatives**: BullMQ (rejected — overkill), setInterval polling (rejected — latency/races)

### Decision 2: API Gateway Rate Limiting
- **Selected**: SHA-256 hashed keys in DB; Redis `INCR` with 60s TTL per workspace
- **Rationale**: Survives multi-instance deploy; no plaintext keys in DB
- **Alternatives**: In-memory maps (rejected — not scalable)

### Decision 3: Magic Link Signatures
- **Selected**: HMAC-SHA256 with `JWT_SECRET`; format `base64Payload.hexSignature`
- **Rationale**: Tamper-proof without JWT library dependency
- **Alternatives**: DB token table (rejected — extra round-trips)

### Decision 4: OpenTelemetry Bootstrap
- **Selected**: Next.js `instrumentation.ts` + `@opentelemetry/sdk-node`
- **Rationale**: Official Next.js startup hook
- **Alternatives**: Root layout import (rejected — per-request only)

---

## Track B — SMM Product Completion

### Decision 5: Product Scope (Option B vs C)
- **Selected**: **Option B** — SMM industry features (dashboard, settings, team, inbox, calendar, analytics)
- **Rationale**: Codebase is already Hootsuite/Sprout-shaped; consumer social (Feed, Groups, RSVP) is a different product (~6mo scope)
- **Alternatives**: Option C consumer social network (rejected — scope mismatch with user guide doc)

### Decision 6: Dashboard Home vs Inbox Redirect
- **Selected**: Real dashboard at `/` with KPIs, quick actions, recent posts
- **Rationale**: Matches SMM industry UX and user guide "Dashboard" module (reinterpreted)
- **Alternatives**: Keep redirect to `/inbox` (rejected — poor first-run UX)

### Decision 7: Admin Console Location
- **Selected**: `/admin` for health + links; `/settings/team` for RBAC UI
- **Rationale**: Separates ops monitoring from day-to-day settings; owner/admin gate on server
- **Alternatives**: Single `/admin` with all settings (rejected — cluttered for editors)

### Decision 8: Notifications (Phase 1)
- **Selected**: Computed notifications from existing tables (drafts, scheduled posts, pending reviews)
- **Rationale**: No migration required; immediate value
- **Alternatives**: Dedicated `user_notifications` table (deferred to Phase 2D — mark-read persistence)

### Decision 9: Inbox Without Chatwoot
- **Selected**: Demo mode with sample conversations + banner; optimistic demo send
- **Rationale**: Walkthrough/demo works offline; clear path to live via `CHATWOOT_*` env
- **Alternatives**: Hard error when Chatwoot down (rejected — blocks all demos)

### Decision 10: Schema Bootstrap Strategy
- **Selected**: Two-script approach — `essential_bootstrap.sql` + `schema_patch.sql`
- **Rationale**: Safe for existing DBs (`ADD COLUMN IF NOT EXISTS`); fixes error 42703
- **Alternatives**: Full migration chain only (rejected — too heavy for first-time setup)

### Decision 11: Team Member Provisioning
- **Selected**: Add by email if user already exists in `users` table
- **Rationale**: Minimal viable RBAC without Supabase Admin invite API complexity
- **Alternatives**: Email invite with magic link (planned Phase 2D)

### Decision 12: Internationalization
- **Selected**: Cookie-based `NEXT_LOCALE` (en/es) via existing `next-intl`
- **Rationale**: Infrastructure exists; UI picker added in preferences
- **Alternatives**: URL prefix routing `/en/...` (deferred — larger refactor)

### Decision 13: Theme
- **Selected**: Client-side `localStorage` + `html.dark` class toggle
- **Rationale**: Fast to ship; partial dark styles in `globals.css`
- **Alternatives**: Full design-token dark mode (deferred — needs component audit)

### Decision 14: Health Check in Development
- **Selected**: Redis down does not fail `overall` in non-production
- **Rationale**: Local dev often skips Redis until AI demo; DB-up is sufficient for UI work
- **Alternatives**: Strict all-services-up (rejected — blocks dashboard testing)

---

## Open Questions (Resolved)

| Question | Resolution |
|----------|------------|
| Consumer Feed/Groups in v1? | No — document in USER_GUIDE.md as out of scope |
| Which hostname for dev? | Always `localhost:3000` |
| Walkthrough workspace ID? | `11111111-1111-1111-1111-111111111111` |
