# Nexus Social â€” Client Demo Guide

**Purpose:** Run a complete, end-to-end demonstration of Nexus Social with realistic sample data.  
**Audience:** Presenters and clients (non-technical steps included).  
**App URL:** `http://localhost:3005` (always use `localhost`, not `127.0.0.1`)

---

## Quick start (presenter â€” 5 minutes before the call)

```powershell
cd D:\nexus-social-platform\nexus-social-app

# 1. Infrastructure
docker compose -f docker-compose.redis.yml up -d

# 2. App + worker (two terminals, or use prepare:walkthrough)
npm run dev
# Terminal 2:
npm run worker:dev

# 3. Sample data + automated checks
npm run demo:verify
```

**Checkpoint:** `curl http://localhost:3005/api/health` returns `"status":"ok"` and `"db":"up"`.

---

## Prerequisites (one-time)

| Requirement | How to verify | If missing |
|-------------|---------------|------------|
| Node.js 20+ | `node -v` | Install from nodejs.org |
| Docker Desktop | `docker ps` | Required for Redis |
| Supabase project | Health shows `db: up` | Set keys in `.env.local` |
| Schema patch | AI settings page loads config | Run `npm run schema:patch`, paste SQL in Supabase |
| Dify app published | `npm run ai:verify` passes | Publish app in Dify Cloud; set `DIFY_API_KEY` in `.env.local` |

### CI / staging gate (`npm run ai:verify`)

Run before every staging deploy and in CI when Dify secrets are available:

```powershell
npm run ai:verify
```

| Exit code | Meaning | Action |
|-----------|---------|--------|
| 0 | Dify app published and API key valid | Proceed with deploy |
| 1 | Missing credentials or API error | Fix `DIFY_BASE_URL` / `DIFY_API_KEY` |
| 2 | App not published in Dify Studio | Publish workflow, re-run verify |

CI reference: `.github/workflows/nexus-social-app-ci.yml` runs `npm run ai:verify` with `continue-on-error` when secrets are absent.

| Chatwoot (optional) | Inbox shows live threads | Configure `CHATWOOT_*` in `.env.local` |

---

## Sample data reference (use these exact values)

### Demo account (credentials + seed)

| Field | Value |
|-------|--------|
| Email | `demo@nexussocial.io` |
| Password | `DemoWalk2026!` |

`npm run seed:walkthrough` (requires `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`) creates or refreshes this **email-confirmed** auth user, upserts the `users` row, and links the account to the walkthrough workspace. Sign-in works immediately; no manual Supabase dashboard user creation.

Optional: set `WALKTHROUGH_USER_ID` to a different auth UUID before seeding to attach sample data to another account. Set `SEED_DEMO_USER=false` to skip demo auth provisioning.

```powershell
npm run seed:walkthrough
```

### Seeded workspace

| Field | Value |
|-------|--------|
| Workspace ID | `11111111-1111-1111-1111-111111111111` |
| Display name | **Walkthrough Demo** |
| AI persona | **Walkthrough Agent** |

### Seeded posts (appear on Dashboard & Calendar)

| Status | Platforms | Text |
|--------|-----------|------|
| Published | Twitter, LinkedIn | *Welcome to Nexus Social walkthrough â€” your AI-native social hub.* |
| Scheduled (+1 day) | Instagram | *Scheduled product launch teaser.* |
| Draft | Facebook | *Draft post for calendar review.* |

### Demo inputs for live actions

| Feature | Input to use | Expected result |
|---------|--------------|-----------------|
| **AI caption** | `Announce our Q3 sustainability report with a professional tone for LinkedIn and Twitter` | Generated caption in composer (requires Dify key) |
| **Global search** | `walkthrough` | Matches seeded post + settings routes |
| **Team invite** | `colleague@clientco.com` | Pending invite row (email if Supabase auth configured) |
| **Automation template** | Click **Use Template** on builder | Flow canvas with trigger + action nodes |
| **Report widget** | Add â€œPosts publishedâ€‌ widget | Live count from workspace analytics |
| **Inbox reply (demo mode)** | Type: `Thanks for reaching out â€” we'll follow up within 24 hours.` | Message appears in thread (demo/local mode) |

---

## Automated demo verification

Run before every client session:

```powershell
npm run demo:verify
```

This executes: health check â†’ unit tests â†’ Playwright smoke â†’ seed data â†’ AI webhook fixture â†’ login page check.

**Expected summary:** all steps `PASS`, ending with  
`Demo verification PASSED - ready for client walkthrough at http://localhost:3005`

---

# Step-by-step client walkthrough (~25 minutes)

Follow each step in order. **Expected output** is what the client should see on screen.

---

## Phase 0 â€” System health (2 min)

### Step 0.1 â€” Open health endpoint

1. Open browser tab: `http://localhost:3005/api/health`

**Expected output (JSON):**

```json
{
  "status": "ok",
  "details": {
    "db": "up",
    "redis": "up",
    "chatwoot": "up",
    "dify": "up",
    "overall": "healthy"
  }
}
```

**Presenter narrative:** *â€œBefore we touch the UI, we confirm every integrationâ€”database, queue, Chatwoot, and Difyâ€”is reachable. This is the same probe we use in production monitoring.â€‌*

---

## Phase 1 â€” Authentication (3 min)

### Step 1.1 â€” Sign up or sign in

1. Go to `http://localhost:3005/login`
2. Click **Sign up** tab (first-time) or **Sign in**
3. Enter:
   - Email: `demo@nexussocial.io`
   - Password: `DemoWalk2026!`
4. Click **Create account** or **Sign in**

**Expected output:** Redirect to **Dashboard** (`/`). Top bar shows workspace name and notification bell.

**Checkpoint screenshot:** Login screen â€” clean form, â€œSign in to Nexus Socialâ€‌ heading.

**Presenter narrative:** *â€œNexus uses Supabase Auth with workspace-scoped sessions. Each user only sees data for workspaces they belong toâ€”multi-tenant by design.â€‌*

### Step 1.2 â€” Onboarding tour (new users)

1. If prompted, follow the **8-step onboarding tour** (dashboard welcome â†’ sidebar highlights)
2. Click **Next** through each step; finish on **Done**

**Expected output:** Tour closes; dashboard fully visible with gradient welcome banner.

---

## Phase 2 â€” Dashboard & navigation (3 min)

### Step 2.1 â€” Review KPI tiles

1. Stay on `/` (Dashboard)
2. Point to stat cards: **Total posts**, **Published**, **Drafts**, **Scheduled**

**Expected output (after seed):** At least **1 published**, **1 scheduled**, **1 draft** (numbers may vary if you created extra posts).

**Presenter narrative:** *â€œThe home screen is the command centerâ€”content pipeline status at a glance, with one-click paths to create, schedule, inbox, and analytics.â€‌*

### Step 2.2 â€” Quick actions

1. Click each quick-action tile: **Create Post**, **Calendar**, **Inbox**, **Analytics**
2. Use browser **Back** or sidebar to return to Dashboard

**Expected output:** Each route loads without errors.

### Step 2.3 â€” Global search

1. In the top navbar, click the **search** field
2. Type: `walkthrough`
3. Wait ~1 second for dropdown

**Expected output:** Dropdown lists matching **posts** and **settings routes** (e.g. AI Agent). Click a result to navigate.

**Presenter narrative:** *â€œSearch spans posts, team, and settingsâ€”scoped to the active workspace so clients never leak data across tenants.â€‌*

---

## Phase 3 â€” Content engine (5 min)

### Step 3.1 â€” Create post with AI caption

1. Sidebar â†’ **Create Post** (or `/posts/create`)
2. Check platforms: **Twitter**, **LinkedIn**
3. In the text area, type the prompt:  
   `Announce our Q3 sustainability report with a professional tone for LinkedIn and Twitter`
4. Click **âœ¨ Generate with AI**

**Expected output:** Caption text replaces or appends in the composer (requires Dify published + API key). If Dify unavailable, note graceful error toast.

5. Toggle **Desktop / Mobile** preview on the right panel

**Expected output:** Live social preview updates for selected platforms.

### Step 3.2 â€” Schedule and save

1. Set **Schedule date** to tomorrow (datetime picker)
2. Click **Save as draft** or **Schedule**

**Expected output:** Success toast; redirect or confirmation.

### Step 3.3 â€” Calendar

1. Go to **Calendar** (`/calendar`)

**Expected output:** Seeded **scheduled** post visible on tomorrowâ€™s date; **published** and **draft** posts appear per calendar rules.

**Presenter narrative:** *â€œMarketing teams draft with AI, preview per platform, and schedule from one calendarâ€”no switching tools.â€‌*

---

## Phase 4 â€” Unified inbox (4 min)

### Step 4.1 â€” Open inbox

1. Sidebar â†’ **Inbox** (`/inbox`)

**Expected output:** Conversation list (live Chatwoot threads if configured, or **demo conversations** with amber demo banner if Chatwoot unavailable).

### Step 4.2 â€” Reply to a thread

1. Click the first conversation
2. Type: `Thanks for reaching out â€” we'll follow up within 24 hours.`
3. Press **Send**

**Expected output:** Message appears in the thread; demo mode confirms send locally.

**Presenter narrative:** *â€œThe inbox aggregates email, chat, and social DMs. Agents reply here; AI can auto-respond when the agent is active and the kill switch is off.â€‌*

---

## Phase 5 â€” AI agent configuration (4 min)

### Step 5.1 â€” Open AI settings

1. **Settings** â†’ **AI Agent** (`/settings/ai-agent`)

**Expected output:** Form with **Persona name**, **Dify app ID**, **Dataset ID**, **App API key**, runtime toggles.

### Step 5.2 â€” Verify configuration

1. Confirm **Global kill switch** is **OFF**
2. Confirm **AI agent active** is **ON**
3. Set **Traffic allocation** slider to **100%**
4. Click **Test Dify connection**

**Expected output:** Green toast: *â€œConnected. Sample: â€¦â€‌* (requires published Dify app).

5. Click **Save settings**

**Presenter narrative:** *â€œEach workspace gets an isolated Dify app and API key. Operators can disable AI instantly with the kill switchâ€”messages fall through to humans.â€‌*

---

## Phase 6 â€” Analytics & reputation (4 min)

### Step 6.1 â€” Performance dashboard

1. **Analytics** (`/analytics`)

**Expected output:** Charts/metrics load (seeded data or empty state with no errors).

### Step 6.2 â€” Sentiment

1. **Analytics â†’ Sentiment** (`/analytics/sentiment`)

**Expected output:** Sample row: *â€œLove the new dashboard!â€‌* â€” **POSITIVE**

### Step 6.3 â€” AI performance

1. **Analytics â†’ AI Performance** (`/analytics/ai-performance`)

**Expected output:** Token/confidence panels (may be empty until AI runs in production).

### Step 6.4 â€” Reputation

1. Sidebar â†’ **Reputation** (`/reputation`)

**Expected output:** External review sample â€” *â€œGreat social media management platformâ€¦â€‌* â€” Google, 5 stars, pending.

**Presenter narrative:** *â€œLeaders see engagement, sentiment, and AI quality in one placeâ€”plus reputation monitoring for reviews and social mentions.â€‌*

---

## Phase 7 â€” Automations & reports (3 min)

### Step 7.1 â€” Automation builder

1. **Automations â†’ Builder** (`/automations/builder`)
2. Click **Use Template** (or open seeded **Walkthrough Keyword Reply** flow)

**Expected output:** React Flow canvas with **Comment Trigger** â†’ **Auto Reply** nodes.

### Step 7.2 â€” Reports builder

1. **Reports â†’ Builder** (`/reports/builder`)
2. Add a widget (e.g. posts published / engagement)
3. Save report name: `Q3 Engagement Summary`

**Expected output:** Widget shows live metric from workspace data.

**Presenter narrative:** *â€œNon-developers build automations visually and custom reports without exporting to spreadsheets.â€‌*

---

## Phase 8 â€” Team, admin & security (3 min)

### Step 8.1 â€” Team invites

1. **Settings â†’ Team** (`/settings/team`)
2. Enter email: `colleague@clientco.com`
3. Click **Send invite**

**Expected output:** Pending invite appears in list.

### Step 8.2 â€” SSO configuration

1. **Settings â†’ SSO** (`/settings/sso`)

**Expected output:** OAuth client ID/secret form (save stores workspace config).

### Step 8.3 â€” Admin console

1. **Admin** (`/admin`) â€” requires owner/admin role

**Expected output:** Health tiles for DB, Redis, Chatwoot, Dify; link to AI Agent settings.

**Presenter narrative:** *â€œAdmins manage team growth, enterprise SSO, and platform health from dedicated consolesâ€”no SSH required.â€‌*

---

## Phase 9 â€” Notifications (1 min)

1. Click the **bell icon** in the navbar
2. If seeded notifications exist, click one to mark read

**Expected output:** Unread badge clears; notification detail or navigation.

---

## Phase 10 â€” Technical pipeline demo (optional, 2 min)

For technical audiences, show the AI webhook path:

```powershell
$body = '{"event":"message_created","message":{"message_type":0,"content":"Where is order #7842?","id":9001,"sender":{"id":999}},"conversation":{"id":9001,"inbox_id":1}}'
Invoke-RestMethod -Uri "http://localhost:3005/api/webhooks/chatwoot-ai" `
  -Method POST -ContentType "application/json" `
  -Headers @{ "x-e2e-test" = "true" } -Body $body
```

**Expected output (dev fixture):** `{"status":"ignored","reason":"global_kill_switch_active"}`  
With kill switch **off**, worker running, and Dify configured: `{"status":"enqueued",...}`

**Presenter narrative:** *â€œInbound Chatwoot messages hit our webhook, pass canary routing and kill-switch checks, enqueue to Redis, and the worker calls Dify with the workspaceâ€™s isolated API key.â€‌*

---

# Presenter talk track (section summaries)

| Section | 2â€“3 sentence narrative |
|---------|------------------------|
| **Health** | We prove integrations are alive before the demo. This mirrors production readiness gates. |
| **Auth** | Secure login with workspace isolationâ€”each customerâ€™s data is bounded by RLS and membership. |
| **Dashboard** | One home for content status, quick actions, and searchâ€”built for daily marketing ops. |
| **Content** | AI-assisted drafting, platform previews, and calendar scheduling replace fragmented tools. |
| **Inbox** | Omnichannel conversations in one view; AI assists or humans take over instantly. |
| **AI Agent** | Per-workspace Dify config, kill switch, and traffic allocation give operators full control. |
| **Analytics** | Engagement, sentiment, and AI performance prove ROI and quality. |
| **Automations** | Visual flows connect triggers to actions without code. |
| **Team & Admin** | Invites, SSO, and health monitoring support enterprise rollouts. |

---

# Troubleshooting during live demos

| Symptom | Fix |
|---------|-----|
| Blank dashboard after login | `npm run seed:walkthrough` with your `WALKTHROUGH_USER_ID` |
| AI caption fails | Publish Dify app; set `DIFY_API_KEY`; restart dev server |
| AI settings empty | Run `npm run schema:patch` â†’ paste in Supabase SQL Editor |
| Inbox demo banner only | Expected without Chatwoot; configure `CHATWOOT_*` for live threads |
| AI replies not sending | Redis up + `npm run worker:dev`; kill switch OFF |
| 404 on pages | Use `http://localhost:3005`, not `127.0.0.1` |

---

# Files & commands reference

| Command | Purpose |
|---------|---------|
| `npm run demo:verify` | Full pre-demo automated check |
| `npm run seed:walkthrough` | Load all sample data |
| `npm run schema:patch` | Copy schema SQL + Supabase link |
| `npm run ai:verify` | Test Dify API key |
| `npm run worker:dev` | Background AI queue consumer |
| `npm run prepare:walkthrough` | One-shot infra + seed prep |

**Related docs:** [USER_GUIDE.md](./USER_GUIDE.md) آ· [WALKTHROUGH.md](./WALKTHROUGH.md) آ· [DEPLOYMENT.md](./DEPLOYMENT.md)

---

*Last verified: automated demo script `scripts/run-client-demo.ps1` â€” health, unit tests, seed, webhook fixture, and login checks passing on port 3005.*

