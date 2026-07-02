# Quickstart: Nexus Social Platform Validation

Runnable scenarios for Track A (production) and Track B (SMM product).  
See [contracts/](./contracts/) for interface details and [data-model.md](./data-model.md) for schema.

---

## Prerequisites

```powershell
cd D:\nexus-social-platform\nexus-social-app
copy .env.example .env.local
# Fill: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
```

**Database** (once):

1. Open Supabase SQL Editor
2. Run `src/sql/essential_bootstrap.sql`
3. Run `src/sql/schema_patch.sql`

```powershell
npm run seed:walkthrough
npm run dev
```

Use **http://localhost:3000** (not 127.0.0.1).

---

## Scenario 1: Health & Auth

```powershell
curl http://localhost:3000/api/health
```

**Expected**: HTTP 200, `details.db: "up"`, `status: "ok"` (Redis may be down in dev).

1. Open `/login` → sign up or sign in
2. **Expected**: Redirect to `/` dashboard with "Welcome back"

---

## Scenario 2: Dashboard & Navigation

1. `/` — verify KPI cards, quick actions, recent activity
2. Click **Create Post** → `/posts/create` — type text, select Twitter, save
3. **Calendar** — see scheduled/draft posts
4. **Analytics** — charts load (demo data if RPC missing)

**Pass criteria**: No 404; workspace switcher populated.

---

## Scenario 3: Settings & Team

| Step | Route | Action | Expected |
|------|-------|--------|----------|
| Profile | `/settings/profile` | Set display name | Toast success; name on dashboard |
| Security | `/settings/security` | Change password | Success with correct current password |
| Preferences | `/settings/preferences` | Switch EN/ES, dark theme | UI updates |
| Team | `/settings/team` | View members | Owner listed |
| Integrations | `/settings` | Save social handles | Toast success |
| AI Agent | `/settings/ai-agent` | Toggle kill switch | Form visible (not empty) |

---

## Scenario 4: Inbox (Demo or Live)

### Demo mode (Chatwoot not configured)

1. Open `/inbox`
2. **Expected**: Amber demo banner; 3 sample conversations
3. Select conversation → messages render
4. Send reply → toast "Demo reply sent"

### Live mode

```powershell
docker compose -f docker-compose.redis.yml up -d
# Set CHATWOOT_* in .env.local
npm run worker:dev
```

1. `/inbox` — no demo banner
2. Real Chatwoot conversations visible

---

## Scenario 5: Automations & Reputation

1. `/automations/builder` → **Use Template**
2. **Expected**: Canvas opens with nodes; success toast
3. `/reputation` — loads without console errors (empty OK before seed)

---

## Scenario 6: Admin Console

1. `/admin` as workspace owner
2. **Expected**: Health tiles for DB, Redis, Chatwoot, Dify
3. Non-admin user → "Unauthorized"

---

## Scenario 7: Notifications

1. Create a draft post
2. Click navbar **bell**
3. **Expected**: "Draft post needs review" notification

---

## Scenario 8: Production Hardening (Track A)

### Background worker

```powershell
curl -X POST http://localhost:3000/api/webhooks/chatwoot-ai `
  -H "Content-Type: application/json" `
  -H "x-e2e-test: true" `
  -d '{"event":"message_created","message":{"message_type":0,"sender":{"id":999}},"conversation":{"id":1001,"inbox_id":1}}'
```

**Expected**: `{ "status": "ignored", "reason": "global_kill_switch_active" }` (e2e fixture)

### Refund token (invalid)

```powershell
curl "http://localhost:3000/api/tools/approve-refund?token=invalid&action=approve"
```

**Expected**: HTTP 403

---

## Scenario 9: Automated Tests

```powershell
npm run test                                    # Vitest — 7 tests
npx playwright test e2e/smoke.spec.ts           # Playwright smoke
npm run load-test                               # k6 smoke (health + webhook)
npx cypress run --spec cypress/e2e/critical_path.cy.ts
```

**Cypress auth**: Set in `.env.local`:

```env
CYPRESS_TEST_EMAIL=your@email.com
CYPRESS_TEST_PASSWORD=yourpassword
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| 42703 console error | Run `schema_patch.sql` |
| AI Agent empty | Run schema patch; refresh page |
| Inbox fetch failed | Fixed — demo mode; or configure Chatwoot |
| Playwright browser missing | `npx playwright install chromium` |
| Seed membership FK error | Set `WALKTHROUGH_USER_ID` to real auth user UUID after first login |

---

## Next Steps

- Remaining tasks: [tasks-smm.md](./tasks-smm.md)
- User documentation: [nexus-social-app/USER_GUIDE.md](../../nexus-social-app/USER_GUIDE.md)
