# Service Readiness Matrix

This matrix provides a detailed production readiness audit for every service discovered in the repository scope.

## Service Readiness Table

| Service | Functional | Integration | Testing | Security | Deployment | Operations | Readiness Score | Gate |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **nexus-social-app (Web)** | 0 | 0 | 0 | 0 | 0 | 0 | **0%** | **FAIL** |
| **nexus-social-app (Worker)** | 0 | 0 | 0 | 1 | 0 | 0 | **16.6%** | **FAIL** |
| **ml-service** | 1 | 0 | 0 | 1 | 1 | 0 | **50%** | **FAIL** |
| **nexus-mobile** | 0 | 0 | 0 | 1 | 0 | 0 | **16.6%** | **FAIL** |
| **frontend** | 0 | 0 | 0 | 1 | 0 | 0 | **16.6%** | **FAIL** |
| **chatwoot** | 1 | 0 | 1 | 1 | 1 | 1 | **83.3%** | **FAIL** |
| **dify** | 1 | 0 | 1 | 1 | 1 | 1 | **83.3%** | **FAIL** |
| **activepieces** | 1 | 0 | 1 | 1 | 1 | 1 | **83.3%** | **FAIL** |

*Scoring: PASS = 1, FAIL = 0. Readiness Score = (PASS ÷ Total Criteria) × 100.*

---

## Detailed Service Assessment & Evidence

### 1. nexus-social-app (Web)
*   **Functional (FAIL):** Server Actions for Media Upload, AI Fine-tuning, and Native provisioning fail with `Unauthenticated` because they call `supabaseAdmin.auth.getSession()` on a service-role client that doesn't parse cookies.
*   **Integration (FAIL):** Multi-tenant RLS for Dify orchestration is broken because the Dify chat API uses the global `DIFY_API_KEY` header instead of workspace-specific app keys.
*   **Testing (FAIL):** E2E Playwright tests are stubbed without proper assertions (e.g., HITL wait) and k6 load tests allow HTTP 500 errors to pass, masking service failures.
*   **Security (FAIL):** Magic links for refund approvals are encoded via base64 only, lacking any cryptographic signatures, which allows public exploit/replay.
*   **Deployment (FAIL):** Missing `otel-collector-config.yaml` file causes container crash during startup under production configurations.
*   **Operations (FAIL):** Health check endpoint is fake (simulates Chatwoot/Dify is up) and returns HTTP 200 even when database connections fail.

### 2. nexus-social-app (Worker)
*   **Functional (FAIL):** Background job queue processing loop is completely missing. No code pops from the Redis queue.
*   **Integration (FAIL):** Background jobs like automation flows, SQL report generator, and data warehouse synchronizations are dead code.
*   **Testing (FAIL):** Unit/integration tests do not cover background workers or job execution reliability.
*   **Security (PASS):** Standard environment config credentials inherited.
*   **Deployment (FAIL):** Running `node server.js` inside the worker container executes a duplicate web-server instead of a worker runner.
*   **Operations (FAIL):** No telemetry spans sent to collector, OpenTelemetry is never started due to missing `instrumentation.ts`.

### 3. ml-service
*   **Functional (PASS):** FastAPI service runs Prophet and RandomForest prediction models correctly.
*   **Integration (FAIL):** Client application has no service routes calling the ML endpoint.
*   **Testing (FAIL):** Testing script `test_api.py` lacks mocks, making it fail immediately in clean pipelines without live DB credentials.
*   **Security (PASS):** Tenant isolation is explicitly checked via `.eq("workspace_id", ...)` queries.
*   **Deployment (PASS):** Clean `Dockerfile` exists and exposes FastAPI port 8000.
*   **Operations (FAIL):** Lacks structured logging, tracing spans, and liveness/readiness probes.

### 4. nexus-mobile
*   **Functional (FAIL):** Companion features (approvals, omnichannel chat) are missing. Only expo notification setup is present.
*   **Integration (FAIL):** No connection to main application api; supabase connection configuration is present but unused.
*   **Testing (FAIL):** Zero mobile automated test suites exist.
*   **Security (PASS):** Utilizes `expo-secure-store` to handle Supabase tokens.
*   **Deployment (FAIL):** Lacks eas pipeline builds or release configurations.
*   **Operations (FAIL):** Lacks monitoring, diagnostic logs, or error tracking integrations.

### 5. frontend
*   **Functional (FAIL):** The codebase is an untouched template from `create-next-app` with no product logic.
*   **Integration (FAIL):** Completely disconnected from `nexus-social-app` and backend databases.
*   **Testing (FAIL):** No automated tests configured.
*   **Security (PASS):** No custom logic or credentials exposed.
*   **Deployment (FAIL):** No production deployment configurations or Dockerfiles found.
*   **Operations (FAIL):** Observability is non-existent.

### 6. third-party (chatwoot, dify, activepieces)
*   **Functional (PASS):** Standard open-source setups.
*   **Integration (FAIL):** Activepieces workflow builder is client-side only (cannot deploy flows). Chatwoot-to-Dify middleware fails inside the worker queue.
*   **Testing (PASS):** Upstream test coverage is inherited.
*   **Security (PASS):** Standard open-source security profiles.
*   **Deployment (PASS):** Production docker-compose yaml configurations are present.
*   **Operations (PASS):** Standard metrics and logs provided natively.
