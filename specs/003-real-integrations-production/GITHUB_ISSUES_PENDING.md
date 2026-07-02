# GitHub Issues — Feature 003 (create when remote is configured)

No `git remote` is configured. When ready:

```powershell
git remote add origin https://github.com/YOUR_ORG/nexus-social-platform.git
gh auth login
```

Then create these two remaining issues:

---

## T053: Phase 1 UAT — OAuth → schedule → live publish

**Labels:** `feature-003`, `uat`, `operator`

**Body:**

Run operator UAT with LinkedIn/X sandbox credentials:

1. `npm run dev` + `npm run worker:dev`
2. Settings → Connect OAuth (LinkedIn or X)
3. Schedule post 2 minutes ahead
4. Verify status `published` + `external_post_id` in DB

See `nexus-social-app/LAUNCH_CHECKLIST.md` Phase 4.

---

## T057: Meta App Review — enable production Meta publish

**Labels:** `feature-003`, `business-blocker`, `meta`

**Body:**

After Meta App Review approval, run:

```sql
-- scripts/enable-meta-publish.sql
UPDATE workspaces SET meta_app_review_status = 'approved' WHERE id = '<uuid>';
NOTIFY pgrst, 'reload schema';
```

Gate is implemented in worker + `meta_app_review_status` column.
