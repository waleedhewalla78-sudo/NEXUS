import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    constant_request_rate: {
      executor: 'constant-arrival-rate',
      rate: 100, // 100 iterations per timeUnit
      timeUnit: '1s', // 100 triggers per second
      duration: '1m',
      preAllocatedVUs: 200,
      maxVUs: 500,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'], // less than 1% errors
  },
};

const BASE_URL = __ENV.BASE_URL || __ENV.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export default function () {
  const url = `${BASE_URL}/api/webhooks/chatwoot-ai`;

  const payload = JSON.stringify({
    event: 'message_created',
    message: { message_type: 0, sender: { id: 999 }, content: 'PRICE' },
    conversation: { id: Math.floor(Math.random() * 1_000_000), inbox_id: 1 },
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'x-e2e-test': 'true',
    },
  };

  const res = http.post(url, payload, params);

  check(res, {
    'webhook accepted': (r) => r.status === 200,
  });
}
