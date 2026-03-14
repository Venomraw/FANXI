/**
 * Shared config and helpers for k6 load tests.
 *
 * Usage:
 *   brew install k6
 *   k6 run load-tests/steady.js
 *   k6 run load-tests/burst-kickoff.js
 *   k6 run load-tests/burst-whistle.js
 *   k6 run load-tests/reconnect-storm.js
 */

export const BASE_URL = __ENV.API_URL || 'http://localhost:8000';

export const THRESHOLDS = {
  http_req_duration: ['p(95)<500', 'p(99)<1500'],
  http_req_failed: ['rate<0.05'],
};

/**
 * Register a test user and return the access token.
 */
export function registerAndLogin(http, uniqueId) {
  const username = `loadtest_${uniqueId}`;
  const payload = JSON.stringify({
    username: username,
    email: `${username}@loadtest.fanxi`,
    password: 'LoadTest123!',
    country_allegiance: 'Argentina',
  });

  // Register (ignore 400 if already exists)
  http.post(`${BASE_URL}/register`, payload, {
    headers: { 'Content-Type': 'application/json' },
  });

  // Login
  const loginRes = http.post(`${BASE_URL}/login`, `username=${username}&password=LoadTest123!`, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  if (loginRes.status !== 200) return null;
  return loginRes.json().access_token;
}

export function authHeaders(token) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
}

export const SAMPLE_PREDICTION = {
  lineup: {
    GK:  { name: 'E. Martinez', number: 23 },
    RB:  { name: 'N. Molina', number: 26 },
    CB1: { name: 'C. Romero', number: 13 },
    CB2: { name: 'N. Otamendi', number: 19 },
    LB:  { name: 'N. Tagliafico', number: 3 },
    CM1: { name: 'R. De Paul', number: 7 },
    CM2: { name: 'E. Fernandez', number: 24 },
    CM3: { name: 'L. Paredes', number: 5 },
    RW:  { name: 'A. Di Maria', number: 11 },
    ST:  { name: 'L. Messi', number: 10 },
    LW:  { name: 'J. Alvarez', number: 9 },
  },
  tactics: { mentality: 60, lineHeight: 55, width: 50 },
  formation: '4-3-3',
  team_name: 'Argentina',
  timestamp: new Date().toISOString(),
  status: 'LOCKED',
  outcomes: { match_result: 'home' },
};
