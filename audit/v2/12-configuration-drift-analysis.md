# Configuration Drift Analysis

This document identifies mismatches and drifts in configuration parameters across Local Development, CI Pipelines, and Production environments.

## Configuration Matrix Comparison

| Variable Name | Local Dev Default | CI Pipeline Value | Production Value | Drift Risk | Impact |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-supabase-url` | `https://placeholder.supabase.co` | Configured endpoint | **LOW** | Handled correctly. |
| `SUPABASE_SERVICE_ROLE_KEY`| `your-service-role-key` | None | Vault Secret | **MEDIUM** | Required by actions; must be mapped securely. |
| `REDIS_URL` | `redis://localhost:6379` | None | `redis://redis:6379` | **HIGH** | Web container lacks custom network; defaults to host loopback, causing lookup failures in prod. |
| `DIFY_BASE_URL` | `http://localhost:3002` | None | `http://dify-api:5001/v1` | **HIGH** | In prod, relies on Docker container resolution; fails if networks are disconnected. |
| `OTEL_EXPORTER_OTLP_ENDPOINT`| `http://localhost:4318/v1/traces` | None | `http://otel-collector:4318` | **HIGH** | otel collector endpoint fails if container names differ. |
| `INTERNAL_TOOL_SECRET` | None | `test-secret-123` | Vault Secret | **MEDIUM** | Must be aligned between app and tool routes. |

---

## Technical Drift Findings

### 1. Next.js Config Hardcoding (Sentry Org & Project)
Inside `next.config.ts`, the Sentry organization and project details are hardcoded:
```typescript
export default withSentryConfig(withNextIntl(nextConfig), {
  silent: true,
  org: "nexus-social",
  project: "nexus-social-app",
  ...
});
```
This prevents using different Sentry accounts or projects for Staging vs Production environments without modifying the source code, violating 12-factor app configuration principles.

### 2. Redis Connection Defaults
In `src/actions/health.ts` and `src/lib/ai/token-limiter.ts`, the Redis client is initialized with:
```typescript
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
```
During local testing without Docker, this defaults to the host loopback. In production Docker Compose setups, the container name `redis` must be explicitly defined. If `REDIS_URL` is omitted, the production container will attempt to connect to localhost and crash.

### 3. OpenTelemetry Collector Endpoint
The environment variable `OTEL_EXPORTER_OTLP_ENDPOINT` defaults to `http://localhost:4318/v1/traces`. In production, this must be updated to reference `http://otel-collector:4318/v1/traces` and the containers must share a network. Without this configuration, downstream trace exporting fails silently.
