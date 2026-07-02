# Operator Gates — Human / Business Processes

**Not code defects.** These gates require operator action outside the repository.

## B5 — Meta App Review (Facebook / Instagram live publish)

Facebook and Instagram publishing is **blocked in code** until `workspaces.meta_app_review_status = 'approved'`. Completing Meta App Review is a **business process**, not a bug fix: the operator must submit the Nexus Social app in [Meta for Developers](https://developers.facebook.com/), pass App Review for `pages_manage_posts`, `instagram_content_publish`, and related scopes, then connect a **long-lived system user token** (or Page token) via OAuth into `workspace_social_connections`. Until that token exists and review is approved, Postman Test A may complete the AI CMO workflow but **003 live publish to Meta will remain gated** — expected behavior per constitution §3.

## B4 — Feature 003 operator UAT (T053–T057)

After Meta (or LinkedIn/X) credentials are connected in the target workspace, run the operator checklist in `docs/HUMAN-UAT-PLAYBOOK.md`: OAuth connect → schedule post → worker publish → analytics sync. This proves the 003 publish loop on real platform APIs.

## B9 — Production environment (Inngest Cloud, Sentry, prod Supabase)

Use `.env.production.template` as the DevOps checklist. Inngest Cloud signing keys, production Supabase project URL, and Sentry DSN are **deployment configuration**, not application code changes.
