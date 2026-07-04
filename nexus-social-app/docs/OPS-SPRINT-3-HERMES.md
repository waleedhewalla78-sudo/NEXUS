# Sprint 3 Loop 2 — Hermes / VPS Deploy

**Prerequisite:** LinkedIn Developer App created with redirect  
`https://nexussocial.tech/api/oauth/linkedin/callback`

**Code on GitHub:** `main` includes Meta Lead Ads + LinkedIn OAuth + `/settings/integrations`

---

## Paste into Hermes

```text
You are on the Hostinger VPS. We need to inject the new GTM secrets into the production environment and deploy Sprint 3.

EXECUTE THE FOLLOWING STEPS:

STEP 1: Pull Sprint 3 code
Run:
cd /opt/platform && git pull origin main

STEP 2: Inject LinkedIn Secrets
We need to append the LinkedIn OAuth keys to the .env.production file. Run this command, REPLACING the placeholder text with the actual keys from the founder:
cat >> /opt/platform/.env.production << 'EOF'

# Sprint 3: GTM Integration
LINKEDIN_CLIENT_ID=REPLACE_WITH_REAL_CLIENT_ID
LINKEDIN_CLIENT_SECRET=REPLACE_WITH_REAL_CLIENT_SECRET
LINKEDIN_OAUTH_REDIRECT_URI=https://nexussocial.tech/api/oauth/linkedin/callback
NEXT_PUBLIC_APP_URL=https://nexussocial.tech
META_WEBHOOK_SECRET=REPLACE_OPTIONAL_META_APP_SECRET
META_WEBHOOK_VERIFY_TOKEN=REPLACE_OPTIONAL_VERIFY_TOKEN
EOF

STEP 3: Rebuild containers
Run:
docker compose -f docker-compose.prod.yml up -d --build

STEP 4: Verify
Run:
docker ps
echo "Sprint 3 deployed. Check https://nexussocial.tech/settings/integrations to test LinkedIn login."

RESTRICTIONS:
- DO NOT run npm install.
- If build fails, show the exact error.
```

---

## After deploy — founder checks

1. Open https://nexussocial.tech/settings/integrations
2. On **LinkedIn**, click **Connect OAuth**
3. Authorize Diligent AI app
4. Confirm toast “linkedin connected” and badge **OAuth connected**

### Meta Lead Ads simulation (optional)

```bash
# On any machine with curl (dev secret empty = allowed only in non-production)
curl -s -X POST "https://nexussocial.tech/api/v1/enterprise/leads/meta-ads" \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=COMPUTED_HMAC" \
  -d '{"field_data":[{"name":"full_name","values":["Waleed Hewalla"]},{"name":"email","values":["test@example.com"]},{"name":"phone_number","values":["1234567890"]}]}'
```

In production, compute HMAC-SHA256 of the body with `META_WEBHOOK_SECRET`.

Also ensure `enterprise_leads` migration is applied in Supabase SQL Editor:
`supabase/migrations/20260705_enterprise_leads.sql`
