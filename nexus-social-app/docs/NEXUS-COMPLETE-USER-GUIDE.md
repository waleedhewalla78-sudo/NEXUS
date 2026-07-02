# Nexus Social — Complete Product User Guide

**Version:** 2.0 (Enterprise GA)  
**Audience:** End users, workspace administrators, agency operators, client approvers, and platform operators  
**Last updated:** June 2026

---

## Table of contents

1. [Product overview](#1-product-overview)
2. [Getting started](#2-getting-started)
3. [User roles and permissions](#3-user-roles-and-permissions)
4. [Navigation and interface](#4-navigation-and-interface)
5. [Core features — step-by-step](#5-core-features--step-by-step)
6. [AI CMO (autonomous marketing)](#6-ai-cmo-autonomous-marketing)
7. [Integrations reference](#7-integrations-reference)
8. [Role-based workflows](#8-role-based-workflows)
9. [Advanced and power-user topics](#9-advanced-and-power-user-topics)
10. [Configuration, setup, and optimization](#10-configuration-setup-and-optimization)
11. [Troubleshooting](#11-troubleshooting)
12. [Quick reference](#12-quick-reference)
13. [Glossary](#13-glossary)

---

## How to use this guide

This is a **single reference document** for everyone who uses Nexus Social — from first-time content creators to agency administrators and API integrators.

| If you are… | Start here |
|-------------|------------|
| **New user** | [§2 Getting started](#2-getting-started) → [§5.1 Dashboard](#51-dashboard) → [§5.2 Create Post](#52-create-post) |
| **Content / community manager** | [§5 Core features](#5-core-features--step-by-step) → [§8.1 Content manager](#81-content-manager-member) |
| **Workspace admin or owner** | [§3 Roles](#3-user-roles-and-permissions) → [§5.11 Team](#511-settings--team) → [§5.16 Admin console](#516-admin-console) |
| **Agency / portfolio manager** | [§3.2 Agency hierarchy](#32-agency-hierarchy-roles-enterprise) → [§5.15 Agencies](#515-settings--agency-hierarchy) → [§6 AI CMO](#6-ai-cmo-autonomous-marketing) |
| **Client approver (external)** | [§5.20 External Post Approval](#520-external-post-approval) |
| **Developer / integrator** | [§3.5 API access](#35-api-access-developers-and-integrations) → [§5.22 API keys](#522-api-keys-administrator) → [§6.4 Campaign API](#64-triggering-campaigns-api) |
| **Platform operator (DevOps)** | [§10 Configuration](#10-configuration-setup-and-optimization) → [§11 Troubleshooting](#11-troubleshooting) |

Each feature section follows the same pattern:

- **What it does** — purpose in plain language  
- **When to use it** — typical scenarios  
- **How to access it** — route, navigation, or API  
- **Expected outcome** — what success looks like  
- **Best practices** — tips where relevant  

---

## 1. Product overview

### What is Nexus Social?

Nexus Social is an **AI-native social media management (SMM) and omnichannel marketing platform** built for agencies, brands, and enterprise marketing teams. It combines:

- **Content planning and publishing** across major social networks
- **Unified customer inbox** powered by Chatwoot
- **Reputation and social listening**
- **Visual automation workflows**
- **Analytics and custom reporting**
- **AI Agent** for inbox replies and caption generation (Dify-powered)
- **AI CMO** — an autonomous campaign orchestration layer with governance, FinOps, and closed-loop optimization

### Core capabilities at a glance

| Capability | What you can do |
|------------|-----------------|
| **Content** | Draft, AI-generate, schedule, and publish posts; view on a calendar |
| **Inbox** | Read and reply to customer conversations; AI-suggested responses |
| **Reputation** | Monitor mentions, manage listening queries, respond to external reviews |
| **Automations** | Build keyword-triggered and event-driven workflows |
| **Analytics** | Track engagement, sentiment, and AI performance |
| **Reports** | Build drag-and-drop custom dashboards |
| **AI Agent** | Configure persona, kill switch, canary rollout, and token limits |
| **AI CMO** | Run AI-planned campaigns with policy checks, approvals, and ROI tracking |
| **Team & access** | Invite members, assign roles, configure SSO |
| **Client portal** | Give clients read-only calendar access |
| **Public pages** | Branded Nexus Page (`/p/your-slug`) and custom-domain stubs |

### How workspaces fit together

Nexus Social is **multi-tenant**. Your data lives inside a **workspace** — the primary unit for posts, inbox, settings, and billing. Larger organizations may also use:

```
Tenant (organization)
  └── Agency (reseller / business unit)
        └── Brand (client brand)
              └── Workspace (day-to-day operations)
```

Most day-to-day users interact with **one workspace at a time**, switched via the navbar workspace switcher.

### Local vs production URLs

| Environment | Base URL |
|-------------|----------|
| Local development | `http://localhost:3005` |
| Staging / production | Your deployed domain (e.g. `https://app.yourcompany.com`) |

> **Tip:** For local development, always use **`localhost:3005`**, not port 3000 or `127.0.0.1`, to avoid cookie and redirect issues.

---

## 2. Getting started

### 2.1 Create an account and sign in

**What it does:** Authenticates you via Supabase Auth and creates or attaches you to a workspace.

**When to use:** First visit, or after signing out.

**How to access:** `/login`

**Steps:**

1. Open **Sign in** or **Sign up** at `/login`.
2. Enter your **email** and **password** (minimum 6 characters for new accounts).
3. Click **Sign in** or **Create account**.
4. On first login, a workspace is created automatically for you.
5. You land on the **Dashboard** (`/`).

**Expected outcome:** You see the main app with sidebar navigation. Your email appears in the top navbar.

**Demo account (after seeding):**

| Field | Value |
|-------|-------|
| Email | `demo@nexussocial.io` |
| Password | `DemoWalk2026!` |

Run `npm run seed:walkthrough` once (administrator task) to provision demo data.

---

### 2.2 First-time database setup

**What it does:** Ensures Supabase tables and policies exist so features do not error.

**When to use:** You see setup banners, empty modules, or database errors on login.

**How to access:** `/setup` or administrator migration commands

**Steps (administrator):**

1. Apply migrations in order from `supabase/migrations/` (via `npm run db:migrate` or Supabase SQL Editor).
2. Run `npm run schema:verify` to confirm required tables exist.
3. Hard-refresh the browser (Ctrl+Shift+R).
4. Optionally seed walkthrough data: `npm run seed:walkthrough`.

**Expected outcome:** Dashboard KPIs populate; settings and inbox load without schema errors.

---

### 2.3 Onboarding tour

**What it does:** A guided 8-step tour (Driver.js) for new users.

**When to use:** First session after login.

**How to access:** Triggered automatically for new users; covers dashboard, workspace switcher, settings, create post, AI caption, schedule, calendar, and analytics.

**Expected outcome:** Familiarity with primary navigation and post creation flow.

---

## 3. User roles and permissions

Nexus Social uses **two role systems** depending on organization size. Most teams use **workspace roles** only.

### 3.1 Workspace roles

Assigned via **Settings → Team** (`/settings/team`).

| Role | Can do | Cannot do |
|------|--------|-----------|
| **Owner** | Everything an admin can do; created automatically with the workspace; full workspace data access | Cannot be assigned via team UI; GDPR export/delete may be admin-only in some flows |
| **Admin** | Team invites and role changes; SSO configuration; AI Agent provisioning; admin console; API key management (database level) | — |
| **Member** | Create and manage posts, inbox, reputation, automations, analytics, reports; view AI Ops; use approval inbox | Cannot manage team, SSO, or workspace-level API keys |

**Database enforcement:** Row Level Security (RLS) ensures users only see data for workspaces they belong to. Owner, admin, and member share the same RLS read/write access for most content tables; admin-only actions are enforced in server code.

---

### 3.2 Agency hierarchy roles (enterprise)

For multi-agency tenants, additional roles apply at the **agency** level (`/settings/agencies` — direct URL; not in main sidebar).

| Role | Scope | Can do | Cannot do |
|------|-------|--------|-----------|
| **Tenant admin** | Entire tenant | View and manage all agencies and brands under the tenant | Access other tenants' data |
| **Agency admin** | One agency | Manage brands and campaigns for assigned agency only | Access another agency's brands in the same tenant |
| **Workspace operator** | Workspace | Same as workspace member (standard app access) | Cross-agency visibility without membership |

#### Persona mapping (everyday job titles)

| Job title you may recognize | Nexus role equivalent |
|----------------------------|------------------------|
| **End user / content creator** | Workspace **member** |
| **Team lead / manager** | Workspace **admin**, or **agency admin** for multi-client agencies |
| **Account owner / founder** | Workspace **owner** |
| **Client contact** | **Client portal** user or **external approver** (token link) |
| **Marketing ops / integrator** | **API key** holder (no special UI role) |
| **Enterprise IT** | SSO administrator + **tenant admin** |

**Tenant plans:** `free`, `professional`, `agency`, `enterprise`  
**Data regions:** `eu`, `mena`, `us` (affects policy rules and data routing)

---

### 3.3 Client portal users

**What they are:** External client contacts with read-only access to scheduled content for their brand.

**How to access:** `/dashboard` (client portal route — separate from main app dashboard)

**Can do:** View scheduled posts filtered to their client brand  
**Cannot do:** Edit posts, access inbox, settings, or AI CMO ops

Client users are mapped in the `client_users` table (no separate role enum). Setup is administrator-driven.

---

### 3.4 External approvers (token links)

**What they are:** Clients or stakeholders who approve specific posts without a full account.

**How to access:** Email link → `/approve/[token]`

**Can do:** Approve or reject a single post via secure token  
**Cannot do:** Browse the full application

---

### 3.5 API access (developers and integrations)

**What it is:** Workspace-scoped **API keys** for programmatic access (AI CMO campaigns, posts, approvals, etc.).

**Authentication:** `x-api-key` header or `Authorization: Bearer <key>`

**Who manages keys:** Workspace **admins** (RLS); owners typically have equivalent app-level access.

**Important:** API routes use elevated server access after key validation. Keys are stored as SHA-256 hashes — the raw key is shown only once at creation.

**Rate limits:** Default 60–100 requests/minute per workspace (tier-dependent).

---

### 3.6 Permission summary matrix

| Action | Owner | Admin | Member | Client portal | API key |
|--------|:-----:|:-----:|:------:|:-------------:|:-------:|
| Create / schedule posts | ✓ | ✓ | ✓ | — | ✓ |
| Inbox reply | ✓ | ✓ | ✓ | — | — |
| Team management | ✓ | ✓ | — | — | — |
| SSO configuration | ✓ | ✓ | — | — | — |
| AI Agent settings | ✓ | ✓ | — | — | — |
| Admin console `/admin` | ✓ | ✓ | — | — | — |
| AI CMO approval inbox | ✓ | ✓ | ✓ | — | ✓ (API) |
| Trigger AI CMO campaigns | — | — | — | — | ✓ |
| View client calendar | — | — | — | ✓ | — |

---

## 4. Navigation and interface

### 4.1 Main sidebar

Fixed left navigation (visible on all authenticated routes except special layouts):

| Icon area | Label | Route |
|-----------|-------|-------|
| Home | Dashboard | `/` |
| Chart | Analytics | `/analytics` |
| Calendar | Calendar | `/calendar` |
| Plus | Create Post | `/posts/create` |
| Mail | Inbox | `/inbox` |
| Bot | Reputation | `/reputation` |
| Repeat | Automations | `/automations/builder` |
| Bot | AI Agent | `/settings/ai-agent` |
| Gear | Settings | `/settings` |

**Not in sidebar** (use dashboard links, global search, or direct URL):

| Route | Purpose |
|-------|---------|
| `/reports/builder` | Custom report builder |
| `/analytics/sentiment` | Sentiment breakdown |
| `/analytics/ai-performance` | AI quality metrics |
| `/ai-ops` | AI Ops / FinOps dashboard |
| `/ai-cmo/approvals` | AI CMO approval inbox |
| `/admin` | Admin health console |
| `/settings/sso` | Enterprise SSO |
| `/settings/migration` | Data import |
| `/settings/agencies` | Agency hierarchy |

---

### 4.2 Top navbar

| Element | Location | Purpose |
|---------|----------|---------|
| **Workspace switcher** | Left of search | Switch between workspaces you belong to |
| **Global search** | Center | Find posts, team members, settings routes |
| **Notification bell** | Right | User notifications |
| **Email + Sign out** | Far right | Account menu |

---

### 4.3 Settings sub-navigation

On all `/settings/*` pages, horizontal tabs appear:

**Integrations · Profile · Security · Preferences · Team · Admin**

Additional links in the Integrations hub footer: **SSO**, **Data migration**.

---

### 4.4 Layout exceptions (no sidebar)

These routes use a minimal layout:

| Route | Purpose |
|-------|---------|
| `/login` | Authentication |
| `/setup` | Database bootstrap |
| `/approve/[token]` | External post approval |
| `/p/[slug]` | Public Nexus Page |
| `/_custom/[hostname]` | White-label domain stub |
| `/dashboard` | Client portal |

---

### 4.5 Visual layout reference

These ASCII layouts describe what you see on screen. Actual styling uses a white sidebar, gray background, and indigo action buttons.

#### Login screen (`/login`)

```
┌─────────────────────────────────────────────┐
│         Sign in to Nexus Social             │
│    AI-native social media management        │
│  ┌─────────────┬─────────────┐              │
│  │   Sign in   │   Sign up   │  ← tabs      │
│  └─────────────┴─────────────┘              │
│  Email address  [ you@company.com      ]    │
│  Password       [ ••••••••             ]    │
│  Forgot password?                           │
│  [ error banner — red, if auth fails ]      │
│  ┌─────────────────────────────────────┐    │
│  │         Sign in / Create account     │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

#### Main app shell (authenticated)

```
┌──────────┬──────────────────────────────────────────────────┐
│ SIDEBAR  │  NAVBAR: [Workspace ▼] [Search…] [🔔] user@… Out │
│          ├──────────────────────────────────────────────────┤
│ Dashboard│                                                  │
│ Analytics│              MAIN CONTENT AREA                   │
│ Calendar │         (module page loads here)                 │
│ Create   │                                                  │
│ Inbox    │                                                  │
│ Reputatn │                                                  │
│ Automate │                                                  │
│ AI Agent │                                                  │
│ Settings │                                                  │
└──────────┴──────────────────────────────────────────────────┘
```

#### Inbox (`/inbox`)

```
┌────────────────┬─────────────────────────────┐
│ Conversations  │  Thread header              │
│ ─────────────  │  ───────────────────────────│
│ > Customer A   │  Customer message…          │
│   Customer B   │  Your reply…                │
│   Customer C   │                             │
│                ├─────────────────────────────┤
│  [demo banner  │  [ Type reply…        ] Send│
│   if demo mode]│  [ AI Suggest ]             │
└────────────────┴─────────────────────────────┘
```

#### Post composer (`/posts/create`)

```
Platform toggles: [Twitter] [LinkedIn] [Instagram] …
Content:  [ textarea — caption / post body        ]
          [ ✨ Generate with AI ]
Media:    [ Upload image / video ]
Schedule: [ Scheduled At — date/time picker ]
          [ Save Post ]
Preview:  (live preview panel — right side on desktop)
```

#### Settings hub (`/settings`)

```
Tabs: Integrations | Profile | Security | Preferences | Team | Admin

Social cards (per platform):
  [icon] Twitter    handle [____]  URL [____]  [Connect/Reconnect]
  [icon] LinkedIn   …
  Meta App Review: [ Pending | Approved ] banner when applicable

Footer links: SSO · Data migration
```

#### AI Ops (`/ai-ops`)

```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ AI Cost MTD │ Total Tokens│ Failed Jobs │ Pending     │
│   $12.34    │   45,200    │      2      │ Approvals 3 │
└─────────────┴─────────────┴─────────────┴─────────────┘
Link → /ai-cmo/approvals
```

---

## 5. Core features — step-by-step

### 5.1 Dashboard

**Route:** `/`  
**Who:** All workspace members

**What it does:** Surfaces KPIs, quick actions, recent activity, and shortcuts to key modules.

**UI elements:**

- **Welcome banner** — personalized greeting and workspace name
- **Quick actions** — Create Post, Calendar, Inbox, Analytics
- **KPI cards** — total, published, draft, and scheduled post counts
- **Recent activity** — latest posts
- **Announcements** — tips and draft reminders

**When to use:** Daily check-in; starting any workflow.

**Expected outcome:** At-a-glance health of your content pipeline.

**Best practice:** Use quick actions instead of sidebar for the most common tasks.

---

### 5.2 Create Post

**Route:** `/posts/create`  
**Who:** All workspace members

**What it does:** Compose multi-platform posts with optional AI captions, media, and scheduling.

**Steps:**

1. Open **Create Post** from the sidebar or dashboard.
2. **Select platforms** — Twitter/X, LinkedIn, Instagram, Facebook, YouTube, TikTok (availability depends on connected accounts).
3. **Write content** or click **✨ Generate with AI** for a Dify-powered caption.
4. **Upload media** (optional).
5. Set **Scheduled At** for future publishing, or save as draft.
6. Click **Save Post**.

**Expected outcome:** Post appears on **Calendar** with status `draft`, `scheduled`, or `published` (if immediate publish succeeds).

**Dependencies:** Publishing to live networks requires OAuth connections in Settings and an running publish worker. Meta (Facebook/Instagram) requires **Meta App Review** approval.

**Best practices:**

- Preview on all selected platforms before scheduling.
- Use AI generation as a starting point; edit for brand voice.
- Schedule at least 15 minutes ahead to allow worker pickup.

---

### 5.3 Content Calendar

**Route:** `/calendar`  
**Who:** All workspace members

**What it does:** FullCalendar view of scheduled, published, and failed posts.

**Steps:**

1. Open **Calendar** from the sidebar.
2. Browse by month, week, or day.
3. Click a post to view details.
4. For **failed** posts: use **Retry** or **Reschedule** actions.

**Expected outcome:** Visual timeline of your content plan; failed posts can be recovered.

**When to use:** Planning content density; identifying publish failures.

---

### 5.4 Unified Inbox

**Route:** `/inbox`  
**Who:** All workspace members

**What it does:** Central hub for customer conversations, backed by Chatwoot when configured.

**UI layout:**

- **Left pane** — conversation list
- **Center** — message thread
- **Bottom** — reply composer

**Steps:**

1. Open **Inbox**.
2. Select a conversation.
3. Type a reply or use **AI Suggest** (when AI Agent is active).
4. Click **Send**.

**Expected outcome:** Message delivered to the customer channel via Chatwoot.

**Demo mode:** If Chatwoot is not configured, sample conversations appear with a **demo banner**. Replies are simulated — not sent to real customers.

**Dependencies:** Chatwoot account, API token, inbox-to-workspace mapping, and AI Agent settings for auto-replies.

**Best practices:**

- Keep AI kill switch accessible during incidents (`/settings/ai-agent`).
- Use canary traffic % to roll out AI gradually.

---

### 5.5 Reputation Management

**Route:** `/reputation`  
**Who:** All workspace members

**What it does:** Social listening (queries and mentions) and external review management.

**Steps:**

1. Open **Reputation**.
2. **Configure listening queries** — keywords, hashtags, or brand terms.
3. Review **mentions** as they are collected.
4. Manage **external reviews** and draft replies.

**Expected outcome:** Aggregated mention feed; ability to respond to reviews.

**Dependencies:** Migrations applied (`listening_queries`, `mentions`, `external_reviews` tables). Radar agent (AI CMO) also consumes mention data for campaign intelligence.

---

### 5.6 Automations Builder

**Route:** `/automations/builder`  
**Who:** All workspace members

**What it does:** Visual workflow builder (React Flow) for event-driven automations.

**Steps:**

1. Open **Automations**.
2. Browse the **template gallery** (e.g. keyword reply).
3. **Clone a template** or start blank.
4. Drag nodes on the canvas; connect triggers to actions.
5. Save the flow.

**Expected outcome:** Flow stored in `automation_flows`; matching events forwarded to Activepieces webhook when configured.

**Dependencies:** `ACTIVEPIECES_WEBHOOK_URL` for external execution.

---

### 5.7 Analytics

**Route:** `/analytics`  
**Who:** All workspace members

**What it does:** Performance dashboard — engagement, impressions, platform distribution.

**Sub-pages:**

| Route | Focus |
|-------|-------|
| `/analytics/sentiment` | POSITIVE / NEUTRAL / NEGATIVE / URGENT sentiment bar chart |
| `/analytics/ai-performance` | AI conversations, confidence scores, human edit rate |

**Steps:**

1. Open **Analytics** from sidebar.
2. Select date range and filters.
3. Export data if needed.
4. Navigate to sentiment or AI performance sub-pages for deeper views.

**Expected outcome:** Charts and metrics reflecting post and AI activity.

---

### 5.8 Custom Reports

**Route:** `/reports/builder`  
**Who:** All workspace members

**What it does:** Drag-and-drop report builder with widgets (engagement, platforms, posts published).

**Steps:**

1. Navigate to `/reports/builder` (via search or dashboard link).
2. Add widgets from the palette.
3. Arrange and resize on the canvas.
4. Save the report.

**Expected outcome:** Custom dashboard stored per workspace.

---

### 5.9 Settings — Integrations Hub

**Route:** `/settings`  
**Who:** All members (view); admins for OAuth reconnect

**What it does:** Central place for social connections, website, Nexus Page, and messaging channels.

**Sections:**

| Section | Purpose |
|---------|---------|
| **Social platforms** | Handles and profile URLs for Twitter, LinkedIn, Instagram, Facebook, YouTube, TikTok |
| **OAuth reconnect** | Connect live publishing accounts (Meta, LinkedIn, X) |
| **Meta App Review** | Status banner — publishing blocked until approved |
| **Website** | Company website URL |
| **Nexus Page** | Public link-in-bio slug → `/p/your-slug` |
| **WhatsApp / SMS** | Connect messaging via Chatwoot (`ConnectChannelDialog`) |
| **Dify status** | Connection indicator for AI Agent |

**Steps (connect LinkedIn example):**

1. Go to **Settings → Integrations**.
2. Find **LinkedIn** and click **Connect** or **Reconnect**.
3. Complete OAuth in the popup.
4. Confirm connected badge appears.

**Expected outcome:** Tokens stored encrypted; publish worker can post on your behalf.

**Platform status:**

| Platform | Publishing |
|----------|------------|
| LinkedIn | ✓ Available |
| Meta (Facebook/Instagram) | Gated until Meta App Review approved |
| X (Twitter) | OAuth scaffold; publisher pending X API approval |

---

### 5.10 Settings — Profile, Security, Preferences

| Route | Purpose | Steps |
|-------|---------|-------|
| `/settings/profile` | Display name | Edit name → Save |
| `/settings/security` | Password | Current + new password → Update |
| `/settings/preferences` | Language / theme | Select options → Save |

---

### 5.11 Settings — Team

**Route:** `/settings/team`  
**Who:** Owner and admin

**What it does:** Manage workspace membership.

**Steps:**

1. Open **Settings → Team**.
2. View current members and roles.
3. **Invite** by email (user must sign up first if new).
4. Change roles between **member** and **admin**.

**Expected outcome:** Invitee receives notification; appears in member list after accepting.

**Limitations:** **Owner** role cannot be assigned via UI; first creator retains owner status.

---

### 5.12 Settings — AI Agent

**Route:** `/settings/ai-agent`  
**Who:** Owner and admin

**What it does:** Configure Dify-powered AI for inbox auto-replies and caption generation.

**UI controls:**

| Control | Purpose |
|---------|---------|
| **Persona name** | Display name for AI responses |
| **Dify App ID / Dataset ID** | Links to your Dify workspace |
| **App API Key** | `app-...` key from Dify Studio |
| **Global kill switch** | Instantly disable all AI replies |
| **Canary traffic %** | Percentage of conversations handled by AI |
| **Token limits** | Cap daily AI spend |
| **Test connection** | Verify Dify responds |

**Steps:**

1. Publish your Dify app in Dify Studio.
2. Copy App API Key (`app-...`).
3. Paste into **Settings → AI Agent** and save.
4. Click **Test connection** — expect success banner.
5. Set canary % (start low, e.g. 10%).

**Expected outcome:** Inbox AI suggest/auto-reply works; post composer AI generation works.

**Best practices:**

- Always publish Dify app before going live.
- Run `npm run ai:verify` (administrator) before production enablement.
- Use kill switch during incidents — see `docs/AI_INCIDENT_RUNBOOK.md`.

---

### 5.13 Settings — SSO (Enterprise)

**Route:** `/settings/sso`  
**Who:** Owner and admin

**What it does:** Configure SAML or OAuth SSO per workspace.

**Steps:**

1. Open **Settings → SSO** (link from Integrations footer).
2. Choose provider type: **SAML** or **OAuth**.
3. Enter metadata URL, client ID, and client secret.
4. Enable SSO.
5. Test login via your IdP.

**Expected outcome:** Enterprise users sign in through corporate identity provider; users auto-provisioned on first login.

**Dependencies:** `NEXT_PUBLIC_SAML_ENABLED`, IdP configuration, `NEXTAUTH_URL` matching your app URL.

---

### 5.14 Settings — Data Migration

**Route:** `/settings/migration`  
**Who:** Owner and admin

**What it does:** Upload exports from other tools (e.g. Sprout Social) to Supabase storage for import processing.

**Steps:**

1. Export data from your previous platform.
2. Open **Settings → Data migration**.
3. Upload the export file.
4. Follow on-screen status.

---

### 5.15 Settings — Agency Hierarchy

**Route:** `/settings/agencies`  
**Who:** Tenant admin, agency admin

**What it does:** Manage agencies → brands hierarchy for multi-client organizations.

**Note:** This page exists but is **not linked from the main sidebar**. Navigate directly or use global search.

---

### 5.16 Admin Console

**Route:** `/admin`  
**Who:** Owner and admin

**What it does:** System health monitoring tiles.

**Displays:**

- Database status
- Redis status
- Chatwoot connectivity
- Dify connectivity

**Links to:** Team management, AI Agent, database setup.

**API equivalent:** `GET /api/health` returns JSON with `db`, `redis`, `worker`, `schema`, `chatwoot`, `dify` status.

---

### 5.17 Notifications

**How to access:** Bell icon in top navbar

**What it does:** Shows user notifications (invites, system alerts, draft reminders).

**Expected outcome:** Click notification to navigate to relevant module.

---

### 5.18 Global Search

**How to access:** Search field in navbar

**What it does:** Finds posts, team members, and navigable settings routes.

---

### 5.19 Public Nexus Page

**Route:** `/p/[slug]`  
**Who:** Public (no login)

**What it does:** Branded link-in-bio / landing page configured in Settings → Nexus Page slug.

---

### 5.20 External Post Approval

**Route:** `/approve/[token]`  
**Who:** External approver (token holder)

**What it does:** One-click approve or reject for client sign-off on scheduled content.

**Steps:**

1. Open link from email.
2. Review post preview.
3. Click **Approve** or **Reject**.

**Expected outcome:** Post status updated; scheduler notified.

---

### 5.22 API keys (administrator)

**Route:** Supabase dashboard or admin tooling (no dedicated UI page today)  
**Who:** Workspace **admin** (database RLS); owners typically have equivalent access via app tooling

**What it does:** Creates programmatic credentials for the REST API (`/api/v1/*`), including AI CMO campaigns, posts, and approvals.

**When to use:** Integrating external systems, running UAT/Postman tests, or enabling developer automation.

**Steps (administrator):**

1. Generate a raw key (e.g. `nsk_live_` + random string) — **save it immediately**; only the hash is stored.
2. In Supabase SQL Editor, insert into `api_keys`:

```sql
INSERT INTO api_keys (workspace_id, name, key_hash, rate_limit_tier, scopes)
VALUES (
  'YOUR_WORKSPACE_UUID',
  'Production integration',
  encode(digest('YOUR_RAW_KEY_HERE', 'sha256'), 'hex'),
  'standard',
  '["read:posts","write:campaigns"]'::jsonb
);
```

3. Share the **raw key** securely with the integrator (one time only).
4. Integrator calls APIs with header: `x-api-key: YOUR_RAW_KEY`.

**Expected outcome:** API returns `202` for campaign creation; rate limit headers present on responses.

**Best practices:**

- Rotate keys after staff departures or suspected leaks.
- Use separate keys per integration (name column).
- Never commit raw keys to git or paste in public channels.

**Edge case:** Scopes exist in the database but are not enforced in all API routes today — treat keys as full workspace access until scope enforcement ships.

---

## 6. AI CMO (autonomous marketing)

AI CMO is Nexus Social's **autonomous campaign orchestration layer**. It plans, generates, evaluates, and optionally publishes marketing campaigns with governance and FinOps tracking.

### 6.1 How AI CMO works (conceptual)

```
Campaign request (API)
    → Inngest workflow
        → Strategic Brain (plan + memory)
        → Creator Agent (content)
        → Policy Engine (compliance)
        → Judge Agent (quality)
        → Persist to database
        → Optional publish link
    → Job status (poll)
```

**Background agents** (no direct UI today):

| Agent | Schedule / trigger | Purpose |
|-------|-------------------|---------|
| **Radar** | Every 4 hours | Competitor/trend signals from social listening |
| **Sentinel** | Every 6 hours | Anomaly detection on campaign metrics |
| **Quant** | On analytics sync | Performance insights for replanning |
| **Finance** | During campaigns | ROI from cost ledger + outcomes |
| **Optimizer** | On underperformance | Replan triggered campaigns |

---

### 6.2 AI Ops Dashboard

**Route:** `/ai-ops`  
**Who:** All workspace members

**What it does:** FinOps and operational visibility for AI CMO.

**Displays:**

| Card | Meaning |
|------|---------|
| **Total AI Cost (MTD)** | Sum from `ai_cmo_cost_summary` |
| **Total Tokens** | Token usage this month |
| **Failed Jobs** | Count from `ai_cmo_failed_jobs` |
| **Pending Approvals** | Link to approval inbox |

**When to use:** Daily ops check; incident triage; cost monitoring.

---

### 6.3 Approval Inbox

**Route:** `/ai-cmo/approvals`  
**Who:** All workspace members (workspace-scoped)

**What it does:** Human-in-the-loop review for AI-generated campaign content that failed policy or quality gates.

**When content enters approval:**

- SEO cannibalization detected (>70% similarity)
- Policy engine flags HIGH or CRITICAL risk
- Quality gate: hallucination, auto-reject, or below publish threshold

**UI elements per request:**

- **Severity badge** — CRITICAL, HIGH, MEDIUM, LOW
- **Reason** — why approval is required
- **SLA due date** — default hours: 4 / 24 / 72 / 168 by severity
- **Approve / Reject** buttons

**Steps:**

1. Open `/ai-cmo/approvals` (from AI Ops link or direct URL).
2. Review each pending request.
3. Click **Approve** or **Reject**.
4. Confirm decision.

**Expected outcome:** Request status updates to `approved` or `rejected`; campaign pipeline continues or stops accordingly.

**Note:** Approve/reject via UI may require API key configuration in some deployments. If buttons return 401, contact your administrator to configure session-to-API bridging or use the approvals API directly.

---

### 6.4 Triggering campaigns (API)

**Who:** Integrations, developers, QA (API key required)

There is **no campaign planner page** in the web UI today. Campaigns are triggered via API:

**Create campaign:**

```
POST /api/v1/ai-cmo/campaigns
Header: x-api-key: YOUR_WORKSPACE_API_KEY
Body: {
  "objective": "Launch summer collection for UAE market",
  "brandId": "YOUR_BRAND_UUID",
  "locale": "ar-AE",
  "persona": "operator"
}
```

**Expected response:** `202 Accepted` with `jobId`

**Poll status:**

```
GET /api/v1/ai-cmo/campaigns/jobs/{jobId}
Header: x-api-key: YOUR_WORKSPACE_API_KEY
```

**Terminal statuses:**

| Status | Meaning |
|--------|---------|
| `published` | Content passed all gates and was linked for publish |
| `approval_required` | Waiting in approval inbox |
| `rejected` | Failed quality gate |
| `policy_blocked` | CRITICAL policy violation |

**Automated test:** `npm run test:live-integration` (administrator)

---

### 6.5 Other AI CMO API endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v1/ai-cmo/approvals` | List approval requests |
| `PATCH /api/v1/ai-cmo/approvals/{id}` | Decide approval |
| `GET /api/v1/ai-cmo/channel-risk` | Per-platform risk scores |
| `GET /api/v1/ai-cmo/portfolio-sop` | Portfolio sales & operations planning |
| `GET /api/v1/ai-cmo/portfolio/scenarios` | Scenario modeling |
| `GET /api/v1/ai-cmo/confidence` | Campaign confidence metrics |
| `POST /api/v1/ai-cmo/attribution` | Conversion / UTM attribution events |
| `POST /api/v1/ai-cmo/knowledge/ingest` | Index web URL into knowledge hub |

---

### 6.6 Knowledge Hub

**What it does:** Indexes external web content into vector memory (Qdrant) for smarter campaign planning.

**User-facing access:** API only (`POST /api/v1/ai-cmo/knowledge/ingest` with `sourceType: "web_url"`).

**Alternative path:** Upload documents to Dify dataset via AI Agent ecosystem (legacy RAG path).

**No dedicated Knowledge Hub page** exists in the UI today.

---

## 7. Integrations reference

### 7.1 Integration summary

| Integration | User-visible? | Purpose | Configured by |
|-------------|:-------------:|---------|---------------|
| **Supabase** | Login, all data | Database, auth, RLS | Administrator (env) |
| **Chatwoot** | Inbox | Customer messaging | Administrator + Settings |
| **Dify** | AI Agent, captions, inbox AI | LLM + RAG | Admin in AI Agent settings |
| **OpenRouter** | Transparent fallback | LLM + embeddings fallback | Administrator (env) |
| **Ollama** | Transparent (local dev) | Free local LLM | Administrator (env) |
| **Meta OAuth** | Settings connect | Facebook/Instagram publish | Admin + Meta App Review |
| **LinkedIn OAuth** | Settings connect | LinkedIn publish | Admin |
| **X OAuth** | Settings connect | X publish (pending) | Admin |
| **Stripe** | Credits / billing | Payments webhooks | Administrator (env) |
| **Activepieces** | Automations (background) | External automation execution | Administrator (env) |
| **Inngest** | Background (ops UI locally) | Campaign orchestration | Administrator (env) |
| **Redis** | Background | Queues, rate limits, events | Administrator (env) |
| **Qdrant** | Background | Vector memory | Administrator (env) |
| **SAML / NextAuth** | SSO login button | Enterprise auth | Admin + IdP team |
| **Langfuse** | Background (optional) | AI tracing | Administrator (env) |

---

### 7.2 Chatwoot setup (administrator)

**Required environment variables:**

- `CHATWOOT_BASE_URL`
- `CHATWOOT_API_TOKEN`
- `CHATWOOT_ACCOUNT_ID`
- `CHATWOOT_WEBHOOK_SECRET`

**User steps:**

1. Administrator configures env and maps inbox ID in `chatwoot_inbox_workspace_map`.
2. User connects WhatsApp/SMS in Settings if needed.
3. Open Inbox — live conversations appear (no demo banner).

**Verify:** `npm run chatwoot:verify`

---

### 7.3 Dify setup (administrator + admin UI)

**Server env:** `DIFY_BASE_URL`, `DIFY_API_KEY`, `DIFY_ADMIN_API_KEY`  
**Per-workspace:** App ID, Dataset ID, App API Key in `/settings/ai-agent`

**Checklist before production AI:**

1. Publish Dify app in Studio.
2. Run `npm run ai:verify` — exit code 0.
3. Paste App API Key in AI Agent settings.
4. Ensure worker is running for RAG sync.

---

### 7.4 Social publishing setup

**Required:** OAuth tokens via Settings; `PUBLISHING_ENABLED=true`; publish worker running (`npm run worker:dev`).

**Meta gate:** Until Meta App Review is approved, Facebook/Instagram publishing is blocked. Status shown in Settings hub.

**LinkedIn:** Fully operational when OAuth connected.

**X:** OAuth routes exist; publisher not yet enabled.

---

### 7.5 Stripe billing

**Purpose:** AI credit purchases and subscription lifecycle via webhooks.

**User-visible:** Credit balance via ledger; checkout flows external (Stripe-hosted).

**Administrator env:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

---

### 7.6 Enterprise SAML

**Purpose:** Corporate SSO login.

**User experience:** SAML login option when `NEXT_PUBLIC_SAML_ENABLED=true`.

**Administrator env:** `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `SAML_IDP_METADATA_URL`, `SAML_CLIENT_ID`, etc.

**Test IdP (dev):** https://samltest.id

---

## 8. Role-based workflows

### 8.1 Content manager (Member)

**Typical day:**

1. Check **Dashboard** KPIs.
2. **Create Post** → AI caption → schedule for the week.
3. Review **Calendar** for gaps.
4. Reply to **Inbox** messages.
5. Check **Analytics** for top-performing posts.

---

### 8.2 Agency admin (Admin)

**Typical week:**

1. All content manager tasks.
2. **Settings → Team** — invite new client team members.
3. **Settings → AI Agent** — adjust canary % and token limits.
4. **Settings → Integrations** — reconnect OAuth tokens.
5. **Admin console** — verify health tiles green.
6. **AI Ops** — review costs and failed jobs.
7. **Approval Inbox** — clear pending AI CMO requests.

---

### 8.3 Client approver (External)

**Typical task:**

1. Receive email with `/approve/[token]` link.
2. Review post content.
3. Approve or reject.
4. No app login required.

---

### 8.4 Developer / integrator (API key)

**Typical task:**

1. Obtain workspace API key from administrator.
2. `POST /api/v1/ai-cmo/campaigns` with campaign objective.
3. Poll job until terminal status.
4. `GET /api/v1/ai-cmo/approvals` if `approval_required`.
5. `PATCH` approval decision if needed.

---

### 8.5 Platform operator (Owner + DevOps)

**Typical tasks:**

1. Apply migrations; run `npm run schema:verify`.
2. Start Redis, worker, Inngest dev server, Next.js.
3. Monitor `/api/health` and `/admin`.
4. Run UAT: `npm run test:live-integration`.
5. Rotate secrets after incidents (see SRE runbook).

---

## 9. Advanced and power-user topics

### 9.1 Workspace switching

Use the **workspace switcher** in the navbar to change context. All sidebar modules reflect the selected workspace's data.

---

### 9.2 Multi-brand agency hierarchy

For enterprise tenants:

1. Navigate to `/settings/agencies`.
2. Create agencies and assign brands.
3. Tenant admins see all agencies; agency admins see only their agency's brands.
4. AI CMO campaigns link to `brandId` for brand-scoped content.

---

### 9.3 Policy engine (AI CMO)

Automatic compliance checks include:

- Competitor pricing claims
- Legal / financial / healthcare claims
- Religious and political content (blocked)
- Arabic dialect appropriateness
- MENA PDPL and EU AI Act rules

CRITICAL violations → `policy_blocked` (no approval path).  
HIGH violations → approval required.

---

### 9.4 SEO cannibalization guard

If new content is >70% similar to existing indexed content, the campaign is rejected and routed to approval. Powered by Qdrant vector similarity when configured.

---

### 9.5 Closed-loop optimization

After posts publish and analytics sync:

1. `post_analytics` updated by publish worker.
2. Outcome ingestion workflow processes results.
3. Quant agent analyzes performance.
4. Underperforming campaigns trigger replan (`ai-cmo/campaign.underperforming`).

**Local test:** `npm run trigger-local-outcome-loop`

---

### 9.6 Webhook delivery (outbound)

Nexus can deliver HMAC-signed webhooks (`X-Nexus-Signature`) to your endpoints for campaign events. Configure via API key admin tools and `webhook_subscriptions` table.

---

### 9.7 Attribution tracking

Send conversion events to:

```
POST /api/v1/ai-cmo/attribution
```

Include UTM parameters for cost-per-lead calculations in portfolio reports.

---

## 10. Configuration, setup, and optimization

### 10.1 Minimum setup for core SMM features

| Step | Action |
|------|--------|
| 1 | Configure Supabase env vars |
| 2 | Apply database migrations |
| 3 | Start Next.js: `npm run dev` (port 3005) |
| 4 | Sign up / sign in at `/login` |
| 5 | Connect social accounts in Settings |

---

### 10.2 Minimum setup for AI features

| Step | Action |
|------|--------|
| 1 | Core SMM setup complete |
| 2 | Configure Dify keys (server + per-workspace) |
| 3 | Start Redis: `docker compose -f docker-compose.redis.yml up -d` |
| 4 | Start worker: `npm run worker:dev` |
| 5 | Test AI Agent connection in settings |

---

### 10.3 Full AI CMO stack (local)

See `docs/FULL-STACK-LOCAL-SETUP.md` and `docs/HUMAN-UAT-PLAYBOOK.md`.

Additional components:

- Inngest dev server (`localhost:8288`)
- Qdrant (`localhost:6333`)
- Ollama (`localhost:11434`) optional
- Workspace API key in database

**Bootstrap:** `npm run bootstrap:local`  
**Verify:** `npm run verify:v2-stack`  
**Login check:** `node scripts/check-login-status.mjs`

---

### 10.4 Optimization tips

| Area | Tip |
|------|-----|
| **AI costs** | Set token limits; use Ollama locally; monitor AI Ops dashboard |
| **Inbox AI** | Start canary at 10%; increase after quality review |
| **Publishing** | Schedule posts 15+ minutes ahead; monitor calendar for failures |
| **Campaigns** | Ingest brand knowledge URLs before first campaign |
| **Performance** | Keep Redis running; ensure worker heartbeat in `/api/health` |

---

### 10.5 Feature dependencies

```
Supabase (required for everything)
    └── Workspace membership (required for UI)
            ├── Posts / Calendar (core)
            ├── Inbox → Chatwoot + Redis + Worker
            ├── AI Agent → Dify + Redis + Worker
            ├── Publishing → OAuth + Worker + Meta review (Meta only)
            └── AI CMO → API key + Inngest + Redis + LLM provider
                    ├── Qdrant (optional: memory, knowledge, cannibalization)
                    ├── Approvals (policy/quality gates)
                    └── Publish link → Publishing stack
```

---

## 11. Troubleshooting

### 11.1 Authentication and login

| Issue | Cause | Solution |
|-------|-------|----------|
| "Cannot reach Supabase" on sign-up | Dev server stale env or network | Restart `npm run dev`; confirm `NEXT_PUBLIC_SUPABASE_URL` in `.env.local` |
| Sign-in works but empty app | Migrations not applied | Run `npm run db:migrate`; visit `/setup` |
| SAML login fails | IdP misconfiguration | Verify metadata URL, SP entity ID, and `NEXTAUTH_URL` |
| Demo login fails | Demo user not seeded | Run `npm run seed:walkthrough` |

**Login diagnostic:** `node scripts/check-login-status.mjs`

---

### 11.2 Content and publishing

| Issue | Cause | Solution |
|-------|-------|----------|
| Post stuck in `scheduled` | Worker not running | Start `npm run worker:dev` |
| Post status `failed` | OAuth token expired | Settings → Reconnect platform |
| Meta publish blocked | App Review pending | Expected until approved; check Meta banner in Settings |
| AI caption empty | Dify not configured | Settings → AI Agent → add App API Key |

---

### 11.3 Inbox

| Issue | Cause | Solution |
|-------|-------|----------|
| Demo conversations only | Chatwoot not configured | Set `CHATWOOT_*` env vars; map inbox ID |
| AI not replying | Kill switch on or 0% canary | AI Agent settings → enable traffic |
| Slow responses | Dify latency or circuit open | Check `/admin` Dify tile; OpenRouter fallback activates automatically |

---

### 11.4 Database and schema

| Issue | Cause | Solution |
|-------|-------|----------|
| Error `PGRST205` or `42703` | Missing table/column | Apply migrations in order |
| Empty AI Agent settings | Missing `ai_agent_configs` row | Run migrations; refresh page |
| Reputation errors | Missing listening tables | `npm run schema:verify` |

**Schema fix (SQL Editor):** `NOTIFY pgrst, 'reload schema';`

---

### 11.5 AI CMO

| Issue | Cause | Solution |
|-------|-------|----------|
| Campaign API returns 401 | Missing/invalid API key | Create key in Supabase `api_keys` table; use raw key in header |
| Job stuck in `running` | Inngest not connected | Start Inngest dev: `npx inngest-cli dev -u http://localhost:3005/api/inngest` |
| `approval_required` never clears | Approver action failed | Use API PATCH or check Approval Inbox |
| High AI costs | Unbounded token usage | Set limits in AI Agent; review AI Ops dashboard |

---

### 11.6 Health checks

| Check | URL / command |
|-------|---------------|
| App health | `http://localhost:3005/api/health` |
| Admin UI | `/admin` |
| Stack verify | `npm run verify:v2-stack` |
| Login status | `node scripts/check-login-status.mjs` |
| Inngest UI | `http://localhost:8288` |
| Qdrant | `http://localhost:6333/dashboard` |

---

### 11.7 Getting help

| Resource | Location |
|----------|----------|
| User guide (short) | `USER_GUIDE.md` |
| Demo walkthrough | `CLIENT_DEMO.md`, `WALKTHROUGH.md` |
| AI incident response | `docs/AI_INCIDENT_RUNBOOK.md` |
| SRE runbook | `docs/004-SRE-RUNBOOK.md` |
| UAT playbook | `docs/HUMAN-UAT-PLAYBOOK.md` |
| Local setup | `docs/FULL-STACK-LOCAL-SETUP.md` |

---

## 12. Quick reference

### 12.1 URLs

| URL | Purpose |
|-----|---------|
| `/login` | Sign in / sign up |
| `/` | Dashboard |
| `/posts/create` | Post composer |
| `/calendar` | Content calendar |
| `/inbox` | Unified inbox |
| `/reputation` | Social listening & reviews |
| `/analytics` | Performance analytics |
| `/analytics/sentiment` | Sentiment chart |
| `/analytics/ai-performance` | AI quality metrics |
| `/reports/builder` | Custom reports |
| `/automations/builder` | Automation workflows |
| `/settings` | Integrations hub |
| `/settings/ai-agent` | AI Agent controls |
| `/settings/team` | Team management |
| `/settings/sso` | Enterprise SSO |
| `/settings/migration` | Data import |
| `/settings/agencies` | Agency hierarchy |
| `/admin` | Admin health console |
| `/ai-ops` | AI Ops / FinOps |
| `/ai-cmo/approvals` | AI CMO approval inbox |
| `/approve/[token]` | External post approval |
| `/p/[slug]` | Public Nexus Page |
| `/dashboard` | Client portal |
| `/setup` | Database bootstrap |
| `/api/health` | System health JSON |

---

### 12.2 Demo credentials

| Field | Value |
|-------|-------|
| URL | `http://localhost:3005/login` |
| Email | `demo@nexussocial.io` |
| Password | `DemoWalk2026!` |
| Workspace | Walkthrough Demo |

---

### 12.3 Keyboard and browser tips

- Hard refresh after migrations: **Ctrl+Shift+R**
- Use **localhost:3005** consistently (not 127.0.0.1)
- Workspace switcher: top navbar, left of search

---

## 13. Glossary

| Term | Definition |
|------|------------|
| **Workspace** | Primary tenant unit; contains posts, inbox, settings |
| **Brand** | Client brand under an agency; linked to AI CMO campaigns |
| **Agency** | Reseller or business unit managing multiple brands |
| **Tenant** | Top-level organization containing agencies and workspaces |
| **AI CMO** | Autonomous campaign orchestration with 8-agent mesh |
| **Dify** | External LLM + RAG platform for AI Agent |
| **Chatwoot** | External omnichannel inbox platform |
| **Inngest** | Workflow engine for durable AI CMO pipelines |
| **Qdrant** | Vector database for semantic memory |
| **Canary traffic** | Percentage of inbox conversations handled by AI |
| **Kill switch** | Emergency off switch for all AI replies |
| **RLS** | Row Level Security — database-enforced data isolation |
| **SLA** | Service level agreement for approval response time |
| **Nexus Page** | Public link-in-bio page at `/p/[slug]` |
| **API key** | Workspace-scoped programmatic access token |
| **Policy blocked** | CRITICAL compliance violation; campaign cannot proceed |
| **Approval required** | Human review needed before publish |

---

*This guide covers Nexus Social V2.0 including Feature 004 AI CMO Enterprise GA. For API-level UAT steps, see `docs/UAT-004-POSTMAN-COLLECTION.md`. For engineering closure status, see `specs/004-ai-cmo-enterprise/SPECKIT-STATUS.md`.*
