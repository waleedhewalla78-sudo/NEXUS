# Contract: Server Actions

All actions require authenticated session unless noted. Workspace scoping enforced via `workspace_members`.

---

## Auth (`src/actions/auth.ts`)

| Action | Input | Output | Errors |
|--------|-------|--------|--------|
| signInWithEmail | email, password, redirect? | redirect | Invalid credentials message |
| signUpWithEmail | email, password | success message | Validation errors |
| signOut | — | redirect `/login` | — |

---

## Dashboard (`src/actions/dashboard.ts`)

| Action | Input | Output | Auth |
|--------|-------|--------|------|
| getDashboardData | workspaceId | DashboardData | workspace member |

**DashboardData**:
```typescript
{
  userName: string;
  workspaceName: string;
  stats: { totalPosts, publishedPosts, draftPosts, scheduledPosts };
  recentPosts: DashboardPost[];
  announcements: { id, title, body, type }[];
}
```

---

## User Settings (`src/actions/user-settings.ts`)

| Action | Input | Output |
|--------|-------|--------|
| getUserProfile | — | { email, fullName, createdAt } |
| updateUserProfile | fullName | { fullName } |
| changePassword | currentPassword, newPassword | void |
| setLocale | locale: 'en' \| 'es' | void (sets cookie) |

---

## Team Management (`src/actions/team-management.ts`)

| Action | Input | Auth |
|--------|-------|------|
| listTeamMembers | workspaceId | member |
| updateMemberRole | workspaceId, memberId, role | admin/owner |
| addTeamMemberByEmail | workspaceId, email, role | admin/owner |

**Roles**: `owner` | `admin` | `member` — owner role not assignable via UI.

---

## Notifications (`src/actions/notifications.ts`)

| Action | Input | Output |
|--------|-------|--------|
| getNotifications | workspaceId | AppNotification[] |

**AppNotification**:
```typescript
{ id, title, body, href, created_at, read: boolean }
```

---

## Inbox (`src/actions/inbox.ts`)

| Action | Input | Output |
|--------|-------|--------|
| fetchConversations | workspaceId | InboxConversation[] |
| fetchMessages | workspaceId, conversationId | InboxMessage[] |
| sendReply | workspaceId, conversationId, content | message \| { demoMode: true } |

**Demo**: conversation IDs prefixed `demo-` bypass Chatwoot.

---

## AI Agent (`src/actions/ai-agent-settings.ts`)

| Action | Input | Notes |
|--------|-------|-------|
| getAiAgentConfig | workspaceId | Auto-provisions default row if missing |
| updateAiAgentConfig | workspaceId, partial config | admin/owner only |
| ensureDefaultAiAgentConfig | workspaceId | Called on workspace create |

---

## Workspace Bootstrap (`src/actions/ensure-workspace.ts`)

| Action | Input | Output |
|--------|-------|--------|
| listUserWorkspaces | — | { workspaces[], error?, needsDatabaseSetup? } |

Auto-creates workspace on first login if none exist.

---

## Automations (`src/actions/clone-template.ts`)

| Action | Input | Output |
|--------|-------|--------|
| cloneTemplate | templateId, workspaceId | { id, flow_json, persisted: boolean } |

Returns `flow_json` even if DB insert fails (builder UX).
