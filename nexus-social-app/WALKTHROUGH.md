# Nexus Social — Product Walkthrough Guide

Use this guide to demo **Nexus Social**, an AI-native omnichannel social media management platform.

> Full client demo: **[CLIENT_DEMO.md](./CLIENT_DEMO.md)** · Full documentation: **[USER_GUIDE.md](./USER_GUIDE.md)**

## Before you start (5 minutes)

### 1. Start infrastructure

From `nexus-social-app/` (local dev) or monorepo root (full stack):

```powershell
# Local dev (Redis + app + worker)
npm run prepare:walkthrough
```

Full-stack Docker (app + worker + Redis + Chatwoot + Dify + Activepieces):

```powershell
cd ..
cp .env.full-stack.example .env.full-stack
docker compose --env-file .env.full-stack -f docker-compose.full-stack.yml --profile full up -d --build
bash scripts/wait-for-full-stack.sh
```

Or step by step (local dev only):

```powershell
docker compose -f docker-compose.redis.yml up -d
npm run dev
# In a second terminal:
npm run worker:dev
npm run seed:walkthrough
```

### 2. Open the app

**Always use `localhost`, not `127.0.0.1`** — routing depends on the hostname.

| URL | Purpose |
|-----|---------|
| http://localhost:3005/login | Sign in / sign up |
| http://localhost:3005/ | **Dashboard** — home after login |
| http://localhost:3005/inbox | Unified customer inbox |
| http://localhost:3005/calendar | Content calendar |
| http://localhost:3005/analytics | Performance dashboard |
| http://localhost:3005/posts/create | Post composer + AI captions |
| http://localhost:3005/settings/ai-agent | AI agent configuration |
| http://localhost:3005/automations/builder | Visual automation builder |
| http://localhost:3005/api/health | System health check |

### 3. Demo account & data

After first login, seed sample data:

```powershell
# Set your Supabase auth user UUID, then seed:
$env:WALKTHROUGH_USER_ID = "<your-user-uuid>"
npm run seed:walkthrough
```

This creates workspace **Walkthrough Demo** (`11111111-1111-1111-1111-111111111111`) with sample posts, AI config, and analytics data.

---

## Suggested demo script (~15 minutes)

### Act 1 — Platform overview (3 min)

1. Log in at `/login` — you land on the **Dashboard** (`/`).
2. **Onboarding tour** starts automatically for new users (8 steps, includes dashboard welcome).
3. Point out the **workspace switcher** and **notification bell** in the top bar.
4. Walk the sidebar: Dashboard → Calendar → Create Post → Inbox → Analytics → Automations → Settings.

**Talk track:** *"Nexus Social unifies social publishing, customer inbox, and AI automation in one workspace."*

### Act 2 — Content engine (4 min)

1. Go to **Create Post** (`/posts/create`).
2. Select platforms (Twitter, LinkedIn, Instagram).
3. Type a rough prompt, click **✨ Generate with AI** (Dify integration).
4. Show **live social preview** (desktop/mobile toggle).
5. Set a **schedule date** and save as draft.
6. Open **Calendar** — show the scheduled post on the timeline.

**Talk track:** *"AI-assisted drafting with platform previews and calendar scheduling."*

### Act 3 — Unified inbox & AI agent (4 min)

1. Open **Inbox** (`/inbox`).
2. Show Chatwoot-powered omnichannel view (Email, WhatsApp, social DMs).
3. Go to **Settings → AI Agent** (`/settings/ai-agent`).
4. Highlight persona config, knowledge base, kill switch, traffic allocation.

**Talk track:** *"Every workspace gets an isolated AI agent with PII redaction and human-in-the-loop escalation."*

### Act 4 — Analytics & automations (4 min)

1. **Analytics** (`/analytics`) — engagement charts, exportable reports.
2. **Sentiment** (`/analytics/sentiment`) — AI-classified message sentiment.
3. **AI Performance** (`/analytics/ai-performance`) — token usage, confidence scores.
4. **Automations builder** (`/automations/builder`) — visual flows via React Flow + Activepieces.

**Talk track:** *"Measure ROI, monitor AI quality, and automate workflows without code."*

---

## Health check reference

```powershell
curl http://localhost:3005/api/health
```

| Service | Required for demo | Notes |
|---------|-------------------|-------|
| **Redis** | AI webhooks, rate limits | `docker compose -f docker-compose.redis.yml up -d` |
| **Supabase (DB)** | Auth, posts, workspaces | Configure keys in `.env`; run migrations |
| **Dify** | AI captions & replies | Optional for live AI; UI still demoable |
| **Chatwoot** | Live inbox | Optional; inbox UI loads without it |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Pages 404 on `127.0.0.1` | Use `http://localhost:3005` |
| Login works but dashboard empty | Run `npm run seed:walkthrough` after first login |
| Onboarding tour doesn't highlight | Start on `/` (dashboard); hard-refresh; tour anchors in Sidebar/Navbar/Dashboard |
| `/api/health` shows `db: down` | Verify Supabase URL/keys and apply migrations (`scripts/apply-migrations.ps1`) |
| AI replies not processing | Start Redis + `npm run worker:dev` |

---

## Automated verification

```powershell
npm run demo:full-cycle    # Seed all components + tests + E2E (see DEMO_CYCLES.md)
npm run demo:verify-cycle  # Check demo data in all 14 product components
npm test                   # Unit tests (115+)
npm run walkthrough        # Smoke: health + E2E webhook fixture
npm run verify:local       # typecheck + unit + full walkthrough
```

Full cycle guide: **[DEMO_CYCLES.md](./DEMO_CYCLES.md)**
