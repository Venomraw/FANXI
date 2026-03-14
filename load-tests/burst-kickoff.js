/**
 * Burst load test — simulates the prediction rush before kickoff.
 *
 * Scenario: 100 users all submit predictions in a 30-second window.
 * This tests the prediction lock endpoint + DB write throughput.
 * Run: k6 run load-tests/burst-kickoff.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, THRESHOLDS, registerAndLogin, authHeaders, SAMPLE_PREDICTION } from './common.js';

export const options = {
  scenarios: {
    kickoff_burst: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5s', target: 50 },
        { duration: '30s', target: 100 },
        { duration: '5s', target: 0 },
      ],
    },
  },
  thresholds: {
    ...THRESHOLDS,
    'http_req_duration{name:lock}': ['p(95)<2000'],
  },
};

export function setup() {
  // Pre-register test users
  const tokens = [];
  for (let i = 0; i < 100; i++) {
    const token = registerAndLogin(http, `kickoff_${i}`);
    if (token) tokens.push(token);
  }
  return { tokens };
}

export default function (data) {
  const idx = __VU % data.tokens.length;
  const token = data.tokens[idx];
  if (!token) return;

  // Submit prediction (each VU picks a different match)
  const matchId = 1001 + (__VU % 12);
  const res = http.post(
    `${BASE_URL}/predictions/lock/${matchId}`,
    JSON.stringify(SAMPLE_PREDICTION),
    { ...authHeaders(token), tags: { name: 'lock' } },
  );

  check(res, {
    'prediction locked': (r) => r.status === 201,
    'not rate limited': (r) => r.status !== 429,
  });

  sleep(Math.random() * 0.5);
}
