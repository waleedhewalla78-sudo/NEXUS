import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.05'],
    // Allow cold dev servers; tighten to p(95)<2000 in staging/production
    http_req_duration: ['p(95)<60000'],
  },
};

const BASE_URL = __ENV.BASE_URL || __ENV.NEXT_PUBLIC_APP_URL || 'http://localhost:3005';

export default function () {
  const health = http.get(`${BASE_URL}/api/health`);
  check(health, {
    'health status 200': (r) => r.status === 200,
    'health body ok': (r) => {
      try {
        return r.json('status') === 'ok';
      } catch {
        return false;
      }
    },
  });

  const webhookPayload = JSON.stringify({
    event: 'message_created',
    message: { message_type: 0, sender: { id: 999 }, content: 'k6 smoke test' },
    conversation: { id: Math.floor(Math.random() * 1_000_000), inbox_id: 1 },
  });

  // Signature header present for middleware validation; 403 is expected when secret mismatch.
  // expectedStatuses prevents 403 from incrementing http_req_failed (server stability test only).
  const webhook = http.post(`${BASE_URL}/api/webhooks/chatwoot-ai`, webhookPayload, {
    headers: {
      'Content-Type': 'application/json',
      'x-e2e-test': 'true',
      'X-Hub-Signature-256': 'sha256=dummy_k6_signature',
    },
    responseCallback: http.expectedStatuses(200, 403),
  });

  check(webhook, {
    'webhook handled (200 enqueued/ignored or 403 auth reject)': (r) =>
      r.status === 200 || r.status === 403,
  });

  sleep(0.5);
}
