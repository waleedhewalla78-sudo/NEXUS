# Meta App Review Runbook

**Gate:** B1 / HG-005-001 / T057  
**Type:** Human-only — no code changes required (guard already exists in `publish-due-posts.ts`)

---

## Prerequisites

- Meta Developer app created with `${PROD_META_APP_ID}` / `${PROD_META_APP_SECRET}`
- Test Facebook Page and Instagram Business account linked
- Staging demo: schedule → worker → publish screencast ready

---

## Checklist

- [ ] **1.** Open [Meta Developer App Review](https://developers.facebook.com/apps/) → select app → **App Review**
- [ ] **2.** Request permissions:
  - `pages_manage_posts`
  - `instagram_content_publish`
  - `instagram_basic`
  - `pages_read_engagement` (if analytics sync required)
- [ ] **3.** Provide screencast showing: create post → schedule → worker publishes to **test Page**
- [ ] **4.** Written justification per permission (use Nexus publish flow from [`HUMAN-UAT-PLAYBOOK.md`](./HUMAN-UAT-PLAYBOOK.md))
- [ ] **5.** Add Meta test user under **App Roles → Test Users**; provide credentials to reviewer if requested
- [ ] **6.** After approval: connect workspace via **Settings → Integrations → Connect OAuth** (Meta)
  - Tokens stored in `workspace_social_connections` (encrypted) — **not** a global env var
- [ ] **7.** Verify Page token: Graph API Explorer `GET /me/accounts?fields=access_token,name`
- [ ] **8.** Set review status in Supabase SQL Editor:

```sql
UPDATE workspaces
SET meta_app_review_status = 'approved'
WHERE id = '${PROD_WORKSPACE_UUID}';
```

- [ ] **9.** Run OAuth UAT: `npm run uat:t053`
- [ ] **10.** Schedule test post to Instagram/Facebook → confirm worker log shows `published`

---

## Expected behavior when NOT approved

Worker throws: *"Meta App Review pending — Facebook/Instagram publishing is blocked until approved"*

This is **correct** — do not bypass in production.

---

## References

- [`OPERATOR-GATES.md`](./OPERATOR-GATES.md)
- Constitution §3 — Meta App Review gate
