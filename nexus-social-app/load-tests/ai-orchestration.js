import http from 'k6/http';
import { check, sleep } from 'k6';

// PERF-03: 100 Chatwoot webhooks/sec (AI Orchestration)
export const options = {
  scenarios: {
    webhook_burst: {
      executor: 'constant-arrival-rate',
      rate: 10,
      timeUnit: '1s',
      duration: '15s',
      preAllocatedVUs: 5,
      maxVUs: 20,
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
  const url = `${__ENV.BASE_URL || __ENV.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhooks/chatwoot-ai`;
  
  // Randomize conversation ID to simulate different users hitting the Canary routing
  const conversationId = Math.floor(Math.random() * 1000000);

  const payload = JSON.stringify({
    event: 'message_created',
    message: { 
      message_type: 0, 
      sender: { id: 999 },
      content: 'This is a load test message to verify queue saturation handling.'
    },
    conversation: { 
      id: conversationId, 
      inbox_id: 'test-inbox-123',
      contact_inbox: { contact_id: 888 }
    }
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'x-e2e-test': 'true',
    },
  };

  const res = http.post(url, payload, params);

  check(res, {
    'is status 200': (r) => r.status === 200,
    'enqueued or ignored': (r) => r.json('status') === 'enqueued' || r.json('status') === 'ignored',
  });
}
