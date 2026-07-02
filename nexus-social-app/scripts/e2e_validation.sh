#!/usr/bin/env bash
set -e

# Configuration
WEBHOOK_URL="http://localhost:3000/api/webhooks/chatwoot-ai"
# Sample payload – adjust fields as needed for your Chatwoot webhook schema
read -r -d '' PAYLOAD <<'EOF'
{
  "event": "message_created",
  "message": { "message_type": 0, "content": "E2E test payload", "id": 1234 },
  "conversation": { "id": 5678, "inbox_id": 1, "contact_inbox": { "contact_id": 42 } },
  "inbox": { "id": 1 }
}
EOF

echo "[E2E] Sending sample Chatwoot webhook payload..."
curl -s -X POST -H "Content-Type: application/json" -d "$PAYLOAD" "$WEBHOOK_URL" > /dev/null

echo "[E2E] Waiting for worker to process the job..."
sleep 5

# Check Redis queue length (optional – requires redis-cli)
if command -v redis-cli >/dev/null 2>&1; then
  QUEUE_LEN=$(redis-cli LLEN queue:ai-orchestration || true)
  echo "[E2E] Redis queue 'queue:ai-orchestration' length: $QUEUE_LEN"
else
  echo "[E2E] redis-cli not found – skipping Redis check"
fi

echo "[E2E] Validation script finished."
