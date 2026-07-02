#!/usr/bin/env bash
# Wait for full-stack services to become healthy.
# Usage (repo root):
#   bash scripts/wait-for-full-stack.sh
#   FULL_STACK_URL=http://localhost:3005 bash scripts/wait-for-full-stack.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

APP_URL="${FULL_STACK_URL:-http://localhost:3005}"
CHATWOOT_URL="${CHATWOOT_HEALTH_URL:-http://localhost:3003}"
DIFY_URL="${DIFY_HEALTH_URL:-http://localhost:5001}"
ACTIVEPIECES_URL="${ACTIVEPIECES_HEALTH_URL:-http://localhost:8080}"
MAX_ATTEMPTS="${MAX_ATTEMPTS:-60}"
SLEEP_SEC="${SLEEP_SEC:-5}"

wait_for() {
  local name="$1"
  local url="$2"
  local attempt=1

  echo "[wait-for-full-stack] Waiting for ${name} at ${url} ..."
  while [ "$attempt" -le "$MAX_ATTEMPTS" ]; do
    if curl -fsS "$url" >/dev/null 2>&1; then
      echo "[wait-for-full-stack] ${name} is up"
      return 0
    fi
    echo "[wait-for-full-stack] ${name} not ready (${attempt}/${MAX_ATTEMPTS})"
    attempt=$((attempt + 1))
    sleep "$SLEEP_SEC"
  done

  echo "[wait-for-full-stack] ERROR: ${name} did not become healthy"
  return 1
}

wait_for "nexus-web" "${APP_URL}/api/health"

if [ "${WAIT_INTEGRATIONS:-false}" = "true" ]; then
  wait_for "chatwoot" "${CHATWOOT_URL}/api"
  wait_for "dify-api" "${DIFY_URL}/health"
  wait_for "activepieces" "${ACTIVEPIECES_URL}/"
fi

echo "[wait-for-full-stack] Core stack is ready"
