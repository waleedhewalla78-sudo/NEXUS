-- T057: Enable Meta/Facebook/Instagram publish after Meta App Review approval.
-- Run in Supabase SQL Editor ONLY after Meta App Review is granted in Meta Developer Console.
-- Dev walkthrough workspace was set to approved via: npx ts-node scripts/t053-t057-status.ts --approve-meta-dev

-- Production workspace (Whewalla) — run AFTER Meta App Review:
UPDATE workspaces
SET meta_app_review_status = 'approved',
    updated_at = NOW()
WHERE id = '87737e18-8882-4eea-a647-6c3eaa08cd25';

-- Walkthrough demo (already approved 2026-06-24 for dev testing):
-- id = '11111111-1111-1111-1111-111111111111'

-- Verify:
-- SELECT id, name, meta_app_review_status FROM workspaces;

NOTIFY pgrst, 'reload schema';