# Nexus Social — Deep Demo Cycles

Run the full automated cycle first:

```powershell
cd nexus-social-app
npm run demo:full-cycle
```

**Demo login:** `demo@nexussocial.io` / `DemoWalk2026!`  
**Workspace:** Walkthrough Demo (`11111111-1111-1111-1111-111111111111`)  
**URL:** http://localhost:3005 (always `localhost`, not `127.0.0.1`)

---

## Automated cycles (CI / pre-demo)

| Cycle | Command | Validates |
|-------|---------|-----------|
| 0 | Redis via Docker | Queue + rate limits |
| 1 | `npm run seed:walkthrough` | All Supabase demo rows |
| 2 | `npm run test:all` | 133+ unit/integration/smoke tests |
| 3 | `npm run uat:t053:sandbox` | Schedule → publish → external_post_id |
| 4 | Health API | DB + app readiness |
| 5 | `npm run demo:verify-cycle` | 14 component data checks |
| 6 | `e2e/demo-cycle.spec.ts` | All product routes |
| 7 | Chatwoot AI webhook | Inbox AI pipeline |

---

## Manual demo cycles (presenter script)

### Cycle A — Platform & content (5 min)

1. **Dashboard** `/` — KPI tiles, recent posts, notification bell
2. **Calendar** `/calendar` — published, scheduled, draft posts
3. **Create Post** `/posts/create` — multi-platform composer, AI caption, preview
4. **Talk track:** *Unified content engine with AI-assisted drafting and scheduling.*

### Cycle B — Inbox & AI agent (5 min)

1. **Inbox** `/inbox` — omnichannel threads (demo mode if Chatwoot offline)
2. **AI Agent** `/settings/ai-agent` — persona, kill switch, traffic allocation
3. **Talk track:** *Isolated AI per workspace with PII redaction and human-in-the-loop.*

### Cycle C — Analytics & reports (4 min)

1. **Analytics** `/analytics` — engagement charts from seeded `post_analytics`
2. **Sentiment** `/analytics/sentiment` — classified message sentiment
3. **AI Performance** `/analytics/ai-performance` — token usage metrics
4. **Report builder** `/reports/builder` — custom KPI layout
5. **Talk track:** *Real metrics from published posts, not demo fallbacks.*

### Cycle D — Reputation & automations (4 min)

1. **Reputation** `/reputation` — listening queries, mentions, external reviews
2. **Automations** `/automations/builder` — visual flow canvas
3. **Talk track:** *Brand monitoring plus no-code automation.*

### Cycle E — Settings & team (2 min)

1. **Settings** `/settings` — OAuth connect links (LinkedIn, X, Meta)
2. **Team** `/settings/team` — invites and roles
3. **Talk track:** *Multi-tenant workspace with OAuth publishing and team governance.*

---

## Seeded demo data reference

| Component | Table / feature | Demo content |
|-----------|-----------------|--------------|
| Auth | Supabase Auth | demo@nexussocial.io |
| Workspace | workspaces | Walkthrough Demo, Meta gate approved |
| Posts | posts | Published, scheduled (+1d), draft |
| Analytics | post_analytics | 12.5k impressions, engagement metrics |
| Publishing | workspace_social_connections | Facebook sandbox connection |
| AI | ai_agent_configs | Walkthrough Agent |
| Inbox | chatwoot_inbox_workspace_map | Inbox 1 → workspace |
| Reputation | listening_queries, mentions | "Nexus Social" mention |
| Reviews | external_reviews | 5-star Google review (pending) |
| Automations | automation_flows | Keyword reply template |
| Reports | custom_reports | Executive summary layout |
| Notifications | user_notifications | Welcome notification |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Empty dashboard after login | `npm run seed:walkthrough` |
| Analytics empty | Re-seed; check `post_analytics` rows |
| `demo:verify-cycle` fails | Run seed + ensure Supabase keys in `.env.local` |
| AI webhook fails | Start Redis + `npm run worker:dev` |
| Pages 404 on 127.0.0.1 | Use http://localhost:3005 |
