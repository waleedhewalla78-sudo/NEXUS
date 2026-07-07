# Production Secrets Vault Checklist (B4)

**Template:** [`.env.production.template`](../.env.production.template)  
**Cutover:** [`OPS-PROD-CUTOVER.md`](./OPS-PROD-CUTOVER.md)

Copy each row into your secrets manager (1Password, AWS SM, Hostinger env, etc.).  
**Never commit filled values.**

| Variable | Owner | In vault? | Notes |
|----------|-------|-----------|-------|
| `NEXT_PUBLIC_APP_URL` | DevOps | ⬜ | Public prod URL |
| `NEXT_PUBLIC_SUPABASE_URL` | DevOps | ⬜ | Prod project only |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | DevOps | ⬜ | |
| `SUPABASE_SERVICE_ROLE_KEY` | DevOps | ⬜ | Server-only |
| `DATABASE_URL` | DevOps | ⬜ | `/postgres` URI |
| `REDIS_URL` | DevOps | ⬜ | Upstash TLS URL |
| `INNGEST_SIGNING_KEY` | DevOps | ⬜ | Inngest Cloud |
| `INNGEST_EVENT_KEY` | DevOps | ⬜ | |
| `DIFY_API_KEY` | DevOps | ⬜ | Published app key |
| `OPENROUTER_API_KEY` | DevOps | ⬜ | Fallback LLM |
| `NEXTAUTH_SECRET` | DevOps | ⬜ | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | DevOps | ⬜ | Same as `NEXT_PUBLIC_APP_URL` |
| `INTERNAL_TOOL_SECRET` | Security | ⬜ | `openssl rand -hex 32` |
| `TOKEN_ENCRYPTION_KEY` | Security | ⬜ | 64 hex chars |
| `APPROVAL_HMAC_SECRET` | Security | ⬜ | OAuth state + HITL |
| `CHATWOOT_WEBHOOK_SECRET` | DevOps | ⬜ | HMAC verify |
| `META_APP_ID` / `META_APP_SECRET` | Product | ⬜ | After App Review |
| `LINKEDIN_CLIENT_*` | Product | ⬜ | |
| `X_CLIENT_*` | Product | ⬜ | |
| `HUBSPOT_CLIENT_ID` / `HUBSPOT_CLIENT_SECRET` | RevOps | ⬜ | OAuth app |
| `HUBSPOT_WEBHOOK_SECRET` | RevOps | ⬜ | |
| `STRIPE_*` | Finance | ⬜ | If billing live |
| `SENTRY_DSN` | DevOps | ⬜ | Optional |

**Verification after vault fill:**

```powershell
# On staging host with prod-shaped env loaded:
npm run verify:production:uat
npm run verify:production:deploy   # needs NEXT_PUBLIC_APP_URL
```
