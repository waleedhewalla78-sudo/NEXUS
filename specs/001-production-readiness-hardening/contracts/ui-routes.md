# Contract: UI Routes & Layouts

**Hostname rule**: Use `localhost:3000` — not `127.0.0.1` (middleware routing).

---

## Layout Types

| Layout | Routes | Shell |
|--------|--------|-------|
| **Full** | `/`, `/inbox`, `/calendar`, `/settings/*`, `/admin`, etc. | Sidebar + Navbar + WorkspaceGate |
| **Minimal** | `/login`, `/setup`, `/approve/*`, `/p/*`, `/dashboard` (client portal) | No sidebar |

---

## Authenticated Routes

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | DashboardPageClient | Home dashboard |
| `/inbox` | InboxPageClient | Unified inbox |
| `/calendar` | Calendar page | Content schedule |
| `/posts/create` | PostFormContent | Create/schedule posts |
| `/analytics` | AnalyticsDashboard | KPIs & charts |
| `/reputation` | ReputationDashboard | Mentions & reviews |
| `/automations/builder` | React Flow builder | Automation templates |
| `/settings` | SettingsHub | Integrations |
| `/settings/profile` | ProfileSettings | Display name |
| `/settings/security` | SecuritySettings | Password change |
| `/settings/preferences` | PreferencesSettings | Language + theme |
| `/settings/team` | TeamSettings | Members & roles |
| `/settings/ai-agent` | AiAgentSettingsPage | Kill switch, canary |
| `/admin` | AdminPage (RSC) | Health console — owner/admin only |

---

## Public Routes

| Route | Auth |
|-------|------|
| `/login` | None |
| `/setup` | None |
| `/p/[slug]` | None — public link-in-bio |
| `/approve/[token]` | Token-based HITL |

---

## Navbar Elements

| Element | ID / behavior |
|---------|---------------|
| Workspace switcher | `#workspace-switcher` |
| Search | Placeholder input (search not wired) |
| Notifications | NotificationBell dropdown |
| Sign out | Server action |

---

## Sidebar Tour Anchors

| ID | Route |
|----|-------|
| `#nav-dashboard` | `/` |
| `#nav-calendar` | `/calendar` |
| `#btn-create-post` | `/posts/create` |
| `#nav-settings` | `/settings` |
| `#nav-analytics` | `/analytics` |
| `#dashboard-welcome` | `/` (banner) |

---

## Settings Tab Navigation

Rendered by `SettingsNav` in `settings/layout.tsx`:

Integrations → Profile → Security → Preferences → Team → Admin

---

## Error & Empty States

| Condition | UI |
|-----------|-----|
| No workspace | WorkspaceGate / setup panel |
| DB tables missing | WorkspaceSetupRequired + `/setup` |
| Chatwoot down | InboxDemoBanner + demo conversations |
| AI config missing table | Settings page setup hint |
| Non-admin on `/admin` | Unauthorized message |

---

## i18n

- Locales: `en`, `es`
- Cookie: `NEXT_LOCALE`
- Messages: `nexus-social-app/messages/{locale}.json`
