# Remediation Backlog

This backlog lists all identified gaps and issues, prioritized by risk and business impact.

## Backlog Table

| Issue ID | Affected Component | Root Cause | Technical Impact | Business Impact | Priority | Estimated Effort | Target Release |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| **SEC-01** | `api-auth.ts` | Gateway auth is fully mocked. | Bypasses all client key checks and rate limits. | Unauthorized cross-tenant API access. | **CRITICAL** | 2 days | v2.1-alpha |
| **WORK-01**| `worker` service | Queue polling loop is completely missing. | background jobs sit in Redis list unprocessed. | Inbound customer messages never receive AI replies. | **CRITICAL** | 3 days | v2.1-alpha |
| **SEC-02** | `approve-refund` | Magic links lack cryptographic signatures. | Attackers can forge refund urls. | Unauthorized financial transactions. | **CRITICAL** | 2 days | v2.1-alpha |
| **DB-01** | SQL Schema | Core `workspaces` and `users` tables are missing. | Database initialization crashes on execution. | Application cannot be deployed to a clean database. | **CRITICAL** | 1 day | v2.1-alpha |
| **AUTH-01**| Server Actions | Actions query user session on a sessionless service client. | Media upload, SMS/WhatsApp provisioning always fail. | Core admin features are completely broken. | **CRITICAL** | 2 days | v2.1-alpha |
| **TEN-01** | `ai-orchestration` | Agent API calls use a single global key. | All tenants query the same Dify application. | Multi-tenant context leakage and GDPR violation. | **CRITICAL** | 2 days | v2.1-alpha |
| **BUG-01** | Feedback Webhook | DB query tries to select non-existent column `inbox_id`. | Webhook crashes on every message update. | Human edits are never captured in QA logs. | **HIGH** | 1 day | v2.1-beta |
| **OBS-01** | OpenTelemetry | `instrumentation.ts` is missing. | SDK is never initialized; no trace data sent. | Zero visibility into API latency and RAG bottlenecks. | **HIGH** | 2 days | v2.1-beta |
| **DEP-01** | Docker Compose | Network configs prevent container communication. | Web app cannot resolve redis or otel collector. | App crashes when trying to connect to Redis. | **HIGH** | 1 day | v2.1-beta |
| **BILL-01**| `billing.ts` / stripe | Non-atomic read-then-write updates. | Vulnerable to concurrency race conditions. | Loss of credit balance accuracy/revenue leak. | **HIGH** | 2 days | v2.2-stable |

---

## Detailed Remediation Recommendations

### 1. Resolve Gateway Auth Bypass (`api-auth.ts`)
*   **Fix:** Replace the mocked success in `apiAuthMiddleware` with a database lookup using the hashed Bearer token.
*   **Code Change:**
    ```typescript
    const token = authHeader.split(' ')[1];
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const { data: apiKey } = await supabaseAdmin
      .from('api_keys')
      .select('workspace_id, rate_limit_tier')
      .eq('key_hash', tokenHash)
      .single();
    if (!apiKey) return new NextResponse('Unauthorized', { status: 401 });
    ```

### 2. Implement Background Queue Consumer
*   **Fix:** Create a node script `src/bin/worker.ts` that runs a polling loop using Redis `BRPOP` to process events asynchronously.
*   **Code Change:**
    ```typescript
    import Redis from 'ioredis';
    import { processAiOrchestrationJob } from '../jobs/ai-orchestration';
    const redis = new Redis(process.env.REDIS_URL);
    async function loop() {
      while (true) {
        const res = await redis.brpop('queue:ai-orchestration', 0);
        if (res) {
          const payload = JSON.parse(res[1]);
          await processAiOrchestrationJob(payload);
        }
      }
    }
    loop();
    ```
    Update the `worker` service command in `docker-compose.prod.yml` to:
    ```yaml
    command: ["npx", "ts-node", "src/bin/worker.ts"]
    ```

### 3. Secure Refund Magic Links
*   **Fix:** Apply the same HMAC signature logic used in `approvals.ts` to `issue-refund/route.ts` and `approve-refund/route.ts`. Use a server-side `JWT_SECRET` key to verify signatures.
