import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 200 },  // Ramp up to 200 users
    { duration: '2m', target: 200 },  // Sustained load
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<300'], // 95% of requests should be below 300ms
  },
};

const BASE_URL = __ENV.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const SUPABASE_URL = __ENV.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = __ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const TEST_EMAIL = __ENV.TEST_USER_EMAIL || 'test@nexus.social';
const TEST_PASSWORD = __ENV.TEST_USER_PASSWORD || 'password123';

export function setup() {
  const authUrl = `${SUPABASE_URL}/auth/v1/token?grant_type=password`;
  const payload = JSON.stringify({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
    },
  };

  const res = http.post(authUrl, payload, params);
  let token = '';
  
  if (res.status === 200) {
    token = res.json('access_token');
  }
  
  return { token };
}

export default function (data) {
  if (!data.token) return;

  // Simulate user loading the calendar page
  const url = `${BASE_URL}/calendar`;

  const params = {
    headers: {
      'Authorization': `Bearer ${data.token}`,
      'Cookie': `sb-access-token=${data.token};`
    },
  };

  const res = http.get(url, params);

  check(res, {
    'page loaded successfully': (r) => r.status === 200,
  });

  // User typically looks at calendar for a few seconds before doing anything else
  sleep(Math.random() * 3 + 2);
}
