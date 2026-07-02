# Nexus Social — User & Administrator Guide

Nexus Social is an **AI-native social media management (SMM) platform** for agencies and brands: schedule content, manage a unified customer inbox, monitor reputation, and configure AI automation per workspace.

> **Note:** This guide reflects the **actual product** (SMM/omnichannel). It replaces consumer-social concepts (personal Feed, Groups, RSVP Events) with the equivalent SMM workflows.

---

## Part 1: End-user guide

### 1. Getting started

#### Register & log in

1. Open `http://localhost:3005/login` (use **localhost**, not `127.0.0.1`).
2. **Sign up** with email and password (min. 6 characters), or **Sign in** if you already have an account.
3. After login you land on the **Dashboard** (`/`).
4. A workspace is created automatically on first login.

#### First-time setup

If you see a database setup banner:

1. Go to `/setup` or run ordered migrations: `npm run db:migrate` (linked remote) or paste files from `supabase/migrations/` in order into Supabase SQL Editor.
2. Verify with `npm run schema:verify`.
3. Hard-refresh the browser (Ctrl+Shift+R).

Seed demo data (optional):

```powershell
npm run seed:walkthrough
```

---

### 2. Module overview

| Module | Route | Purpose |
|--------|-------|---------|
| **Dashboard** | `/` | Welcome, KPIs, quick actions, recent posts |
| **Analytics** | `/analytics` | Post performance, charts, export |
| **Calendar** | `/calendar` | Scheduled & published content timeline |
| **Create Post** | `/posts/create` | Draft, AI caption, schedule posts |
| **Inbox** | `/inbox` | Unified customer messaging (Chatwoot) |
| **Reputation** | `/reputation` | Social listening & review replies |
| **Automations** | `/automations/builder` | Visual workflow builder |
| **AI Agent** | `/settings/ai-agent` | Kill switch, canary traffic, token limits |
| **Settings** | `/settings` | Integrations, website, social links |

---

### 3. Common workflows

#### Create and schedule a post

1. Dashboard → **Create Post** (or sidebar **Create Post**).
2. Select platforms (Twitter, LinkedIn, Instagram).
3. Write content or click **✨ Generate with AI**.
4. Optionally upload media and set **Scheduled At**.
5. Click **Save Post**.
6. View on **Calendar**.

#### Reply to customers (Inbox)

1. Open **Inbox** from the sidebar.
2. Select a conversation in the left pane.
3. Type a reply or use **AI Suggest**.
4. Click **Send**.

If Chatwoot is not configured, the inbox runs in **demo mode** with sample conversations.

#### Connect publishing & messaging

1. **Settings** → **Integrations** (`/settings`).
2. Link social handles and your company website.
3. **Connect WhatsApp / SMS** for live inbox channels.
4. Configure **AI Agent** at `/settings/ai-agent`.

#### Manage your account

| Task | Where |
|------|-------|
| Display name | Settings → **Profile** |
| Change password | Settings → **Security** |
| Language / theme | Settings → **Preferences** |
| Notifications | Bell icon in top navbar |

---

### 4. UI reference

#### Dashboard (`/`)

- **Welcome banner** — personalized greeting and workspace name
- **Quick actions** — Create Post, Calendar, Inbox, Analytics
- **KPI cards** — total, published, draft, scheduled posts
- **Recent activity** — latest posts
- **Announcements** — tips and draft reminders

#### Navbar

- Workspace switcher (multi-brand / agency)
- Search field (placeholder)
- Notification bell
- Sign out

#### Settings tabs

Integrations · Profile · Security · Preferences · Team · Admin

---

## Part 2: Administrator guide

### Admin console (`/admin`)

Requires **owner** or **admin** role.

- **Health tiles** — Database, Redis, Chatwoot, Dify
- Links to team management, AI agent, database setup
- API health: `GET /api/health`

### Team & access (`/settings/team`)

- View workspace members and roles
- Add members by email (user must sign up first)
- Change roles: **member** or **admin**

### Roles

| Role | Capabilities |
|------|--------------|
| **Owner** | Full access, created with workspace |
| **Admin** | Team management, AI agent settings |
| **Member** | Standard app access |

### Integrations hub (`/settings`)

- Social publishing channels (handles + URLs)
- Website & Nexus Page (`/p/your-slug`)
- WhatsApp / SMS via Chatwoot
- SSO documentation (`/settings/sso`)
- Data migration (`/settings/migration`)

### Health & monitoring

| Check | How |
|-------|-----|
| API health | `curl http://localhost:3005/api/health` |
| Admin UI | `/admin` |
| Redis | Required for AI webhooks — `docker compose -f docker-compose.redis.yml up -d` |
| Worker | `npm run worker:dev` |

### Testing & CI

| Task | Command |
|------|---------|
| Unit tests | `npm run test` |
| Playwright smoke | `npx playwright test e2e/smoke.spec.ts` |
| Cypress critical path | `npx cypress run --spec cypress/e2e/critical_path.cy.ts` |
| k6 load smoke | `npm run load-test` |
| Schema verification | `npm run schema:verify` |
| Staging AI gate | `npm run verify:staging` (includes `ai:verify`) |

### Per-workspace Dify publish checklist

Before enabling AI features for a production workspace:

1. Publish the Dify app in Studio (top-right **Publish**).
2. Run `npm run ai:verify` — exit code must be `0`.
3. In **Settings → AI Agent**, paste the App API Key (`app-...`) and save.
4. Register tools via admin flow so `get_workspace_analytics` and `get_competitor_mentions` are available to the agent.
5. Ensure `DIFY_ADMIN_API_KEY` is set on the server for RAG ingest (`ingest-post-analytics-rag` worker loop).
6. Confirm worker is running (`npm run worker:dev`) so `post_analytics` summaries sync into the workspace dataset.


Set these in `.env.local` for authenticated E2E:

- `CYPRESS_TEST_EMAIL` — test account email
- `CYPRESS_TEST_PASSWORD` — test account password
- `WALKTHROUGH_USER_ID` — Supabase auth user UUID for seed script

CI runs Vitest + Playwright smoke on every PR via `.github/workflows/ci.yml`.

For production deployment, see **`DEPLOYMENT.md`** and run:

```powershell
npm run preflight
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Empty AI Agent settings | Run `npm run db:migrate`; refresh page (auto-provisions default config) |
| Automations template won't load | Run `npm run db:migrate`; check toast errors |
| Inbox shows demo data | Start Chatwoot; set `CHATWOOT_*` in `.env.local` |
| Reputation errors | Run `npm run db:migrate`; confirm `listening_queries` exists via `npm run schema:verify` |
| Console error `42703` or PGRST205 | Apply migrations in order; run `NOTIFY pgrst, 'reload schema'` in SQL Editor |
| Meta publish blocked | Expected until Meta App Review — set `meta_app_review_status = 'approved'` after approval |
| Wrong hostname | Always use `localhost:3005` for local dev |

---

## Quick reference URLs

| URL | Purpose |
|-----|---------|
| `/login` | Sign in / sign up |
| `/` | Dashboard |
| `/inbox` | Unified inbox |
| `/calendar` | Content calendar |
| `/posts/create` | Post composer |
| `/analytics` | Analytics dashboard |
| `/reputation` | Reputation management |
| `/automations/builder` | Automation templates |
| `/settings` | Integrations |
| `/settings/team` | Team management |
| `/admin` | Admin console |
| `/setup` | Database bootstrap SQL |
| `/api/health` | System health |
