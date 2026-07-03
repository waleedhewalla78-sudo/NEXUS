# GitHub Actions — required repository secrets
#
# Configure at: Settings → Secrets and variables → Actions → New repository secret

## schema-gate job (push to main)

| Secret | Source | Used by |
|--------|--------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL | `npm run uat:check-schema` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role | `npm run uat:check-schema` |

Without these secrets, the **schema-gate** job on `main` will fail with missing env.

## Optional (staging / full UAT workflow)

| Secret | Purpose |
|--------|---------|
| `NEXUS_API_KEY` | Postman UAT + ABM seed in CI |
| `NEXT_PUBLIC_DEFAULT_WORKSPACE_ID` | UAT workspace scope |
| `INTERNAL_TOOL_SECRET` | verify:abm-seed |

## CI jobs that do NOT require secrets

| Job | Notes |
|-----|-------|
| `quality` | lint + typecheck |
| `build` | placeholder Supabase keys in workflow env |
| `smoke` | unit + integration + Playwright (`npx playwright install chromium --with-deps`) |
| `docker` | image build smoke |

## Local parity before pushing to main

```powershell
cd nexus-social-app
npm run verify:production:code
npx playwright install chromium
npm run test:e2e
```

See [`docs/OPS-STAGING-VERIFICATION.md`](../docs/OPS-STAGING-VERIFICATION.md).
