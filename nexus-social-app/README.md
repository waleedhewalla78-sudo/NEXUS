# 🚀 Nexus Social Platform

Nexus Social is an enterprise-grade, AI-native omnichannel social media management and customer service platform.

## 📚 Documentation
This repository contains the full 11-Sprint SaaS Architecture and the 5-Week Autonomous AI Agent Blueprint.

- **[Complete Product User Guide](docs/NEXUS-COMPLETE-USER-GUIDE.md):** End-user reference — all features, roles, integrations, workflows, and troubleshooting.
- **[Ollama Agent Integration](docs/OLLAMA-AGENT-INTEGRATION.md):** Local LLM setup for all AI agents + Nexus Copilot.
- **[Master Blueprint](MASTER_BLUEPRINT.md):** The definitive guide to the architecture, prompt engineering, and execution of the platform.
- **[Launch Checklist](LAUNCH_CHECKLIST.md):** The manual steps required to deploy the database schemas and rotate production secrets.
- **[AI Incident Runbook](docs/AI_INCIDENT_RUNBOOK.md):** The operational guide for DevOps to manage the Global Kill Switch and Redis Token Limiters.
- **[QA Test Strategy](qa_test_strategy.md):** The end-to-end testing matrix for Security, Playwright E2E, and k6 Load Testing.

## 🛠️ Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env.local` and populate the keys.
Required Integrations:
- **Supabase:** PostgreSQL database, Authentication, Storage.
- **Dify.ai:** RAG Knowledge Base and LLM Orchestration.
- **Chatwoot:** Omnichannel Inbox (Email, WhatsApp, X, FB).
- **Stripe:** Billing and Subscriptions.
- **Activepieces:** Visual Automations.
- **Redis:** Token Limiters and Rate Limits.

*Note: The platform features a strict boot-time `verifyEnv()` check. It will crash on startup if critical API keys are missing to prevent silent production failures.*

### 3. Database Migration
Apply migrations via Supabase CLI (preferred):

```bash
cd nexus-social-app
npm run db:link          # once — links using project ref from .env.local
npm run db:migrate       # npx supabase db push (no global CLI required)
npm run schema:verify
```

For local Postgres without the CLI:

```powershell
# Set connection string via env, .env.local DATABASE_URL, or -DatabaseUrl
$env:DATABASE_URL = "postgresql://postgres:PASSWORD@db....supabase.co:5432/postgres"
npm run db:migrate:local
```

For local Postgres or manual apply, run SQL files in order from `supabase/migrations/` (see `supabase/migrations/README.md`).

Legacy root-level `*_schema.sql` files remain for reference but are **deprecated** for new installs.

### 4. Start Redis & AI Worker (required for AI replies)
```bash
docker compose -f docker-compose.redis.yml up -d
# Or run the worker locally:
npm run worker:dev
```

### 5. Run Locally
```bash
npm run dev
```

### 6. Full-stack Docker (optional)

From the monorepo root:

```bash
cp .env.full-stack.example .env.full-stack
docker compose --env-file .env.full-stack -f docker-compose.full-stack.yml up -d --build
docker compose --env-file .env.full-stack -f docker-compose.full-stack.yml --profile full up -d --build
bash scripts/wait-for-full-stack.sh
```

**Required services:** `nexus-web`, `nexus-worker`, `nexus-redis`, external Supabase.

**Optional integrations** (`--profile full`): Chatwoot, Dify API/worker, Activepieces — each needs secrets in `.env.full-stack`.

## 🧪 Testing

### Unit Tests (Vitest)
Validates the AI Proxy tools and input schemas.
```bash
npx vitest run
```

### E2E Regression (Playwright)
Validates the PII Redaction, Kill Switch, and HITL pipelines.
```bash
npm run test:e2e
```

### Load Testing (k6)
Validates the Chatwoot webhook queuing mechanism under 100 requests/sec.
```bash
npm run load-test:ai
```

## 🚀 Deployment
This project is built on the **Next.js App Router** and optimized for **Vercel Edge**.
1. Push to your main branch connected to Vercel.
2. Ensure Vercel Environment Variables match your `.env.local`.
3. Vercel Cron will automatically trigger the LLM-as-a-Judge QA pipelines via `api/cron/ai-eval`.

## CI Artifacts

The GitHub Actions workflow uploads all generated files (screenshots, logs, etc.) under the `artifacts/` directory as CI artifacts. You can download them from the workflow run details for further inspection.

---
*Built with ❤️ using the SCADA Framework.*
