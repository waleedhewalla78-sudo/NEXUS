# 9. User Interface & Navigation

← [PRD Index](./README.md) · [10 Auth & Roles](./10-auth-roles-permissions.md)

---

## 9.1 Information architecture

```text
Public
├── /enterprise
├── /login
└── /approve/[token]

SaaS UI (ENABLE_SaaS_UI=true)
├── /
├── /intelligence
├── /analytics, /calendar, /posts/create
├── /inbox, /reputation, /automations/builder
├── /ai-cmo/campaigns/new
├── /enterprise/leads
├── /settings/*
└── /ai-cmo/* (abm, attribution, approvals, control-plane)

Enterprise skin (ENABLE_SaaS_UI=false)
├── /intelligence
├── /enterprise/leads
├── /settings/integrations
└── /ai-cmo/control-plane
```

---

## 9.2 Navigation behavior

| Element | SaaS UI | Enterprise skin |
|---------|---------|-----------------|
| Sidebar title | Nexus Social | Nexus Enterprise |
| Collapsible | ✅ | ✅ |
| Workspace switcher | Visible | Hidden |
| Global search | Visible | Hidden |
| Onboarding tour | Enabled | **Disabled** |
| Sign in | `signIn('github')` | Same |

---

## 9.3 Form & screen specs

### `/enterprise` — Lead form

| Field | Type | Required |
|-------|------|----------|
| firstName | text | Yes |
| lastName | text | No |
| email | email | Yes |
| company | text | No |
| message | textarea | No |

### `/enterprise/leads` — Table columns

Name · Email · Company · Source (badge) · Status (badge) · Date

### `/intelligence` — Controls

| Element | Type |
|---------|------|
| Date from / to | date input |
| Upload Data | file picker (CSV) |
| Generate Brief | button |
| Webhook URL | read-only |
| Feed cards | timeline (serif briefs) |
| Copy | per-brief button |

### `/ai-cmo/campaigns/new` — Brief wizard

role (dropdown) · domain · coreObjective · targetRole · market · artifactType — all required except where noted in wizard.

### `/settings/integrations`

LinkedIn · Meta · HubSpot · X — connect/disconnect + status badges.

---

## 9.4 Navigation flows

| From | To | Trigger |
|------|-----|---------|
| `/enterprise` | `#lead-form` | Book a demo CTA |
| Navbar | GitHub OAuth | Sign in |
| Unauthenticated | `/login?redirect=` | Middleware |
| OAuth complete | `/` or callbackUrl | NextAuth |

---

*Implementation: `src/components/Sidebar.tsx`, `Navbar.tsx`, `AppShell.tsx`*
