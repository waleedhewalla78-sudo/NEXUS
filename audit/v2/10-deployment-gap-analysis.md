# Deployment Gap Analysis

This document identifies infrastructure, containerization, and pipeline gaps preventing the safe and predictable deployment of the platform to production.

## Docker & Containerization Gaps

### 1. Missing OpenTelemetry Configuration File
The `otel-collector` service in `docker-compose.prod.yml` mounts a local file:
```yaml
volumes:
  - ./otel-collector-config.yaml:/etc/otel-collector-config.yaml
```
Because `otel-collector-config.yaml` is missing from the repository, running `docker compose` immediately fails with a file mount error.

### 2. Broken Container Networks
In `docker-compose.prod.yml`:
*   `otel-collector` and `worker` are assigned to `nexus-network`.
*   The primary `web` application container has **no network configuration** defined. It defaults to the compose default network and cannot resolve or reach the `redis` or `otel-collector` hosts, breaking all Redis-dependent operations (token limits, rate limits).
*   `redis` is located in a separate file `docker-compose.redis.yml` and is not joined to `nexus-network`, separating the database from the web server.

### 3. Worker Service Command Mismatch
The `worker` container is defined with:
```yaml
command: ["node", "server.js"]
```
In Next.js standalone builds, `server.js` starts the web app server. Running this command inside the worker container executes a duplicate web-server listening on port 3000 rather than running a background task queue loop.

---

## Database Migration Gaps

### 1. Missing Core Tables
Running database initializations on any environment fails because the migrations attempt to create foreign keys referencing `workspaces` and `users` tables, which are never defined in the repository.

### 2. Manual Bucket Provisioning
The `enterprise-migrations` storage bucket is required by the Migration Hub page but is missing from the SQL schema setup. It must be created manually, leading to deployment drifts.

---

## CI/CD Pipeline Gaps

### 1. No Test Database Integration in CI
The GitHub Actions workflow (`ci.yml`) runs `npm run build` and builds the Docker image. However, **it never spins up a test database container** to run and validate the database schema files. Schema syntax errors or missing table definitions are undetected until manual deployment.

### 2. Mocked Latency k6 Tests
The k6 load tests are configured to allow HTTP 500 responses. This prevents the pipeline from verifying the functional capacity of the API endpoints, only verifying network response speeds.
