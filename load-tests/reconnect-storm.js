/**
 * Reconnect storm — simulates all clients reconnecting after a backend restart.
 *
 * Scenario: 100 VUs simultaneously hit /health + /ready + /matches/all
 * in rapid succession, simulating the thundering herd on cold start.
 * Run: k6 run load-tests/reconnect-storm.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, THRESHOLDS } from './common.js';

export const options = {
  scenarios: {
    reconnect_storm: {
      executor: 'shared-iterations',
      vus: 100,
      iterations: 500,
      maxDuration: '30s',
    },
  },
  thresholds: {
    ...THRESHOLDS,
    'http_req_duration{name:health}': ['p(95)<200'],
  },
};

export default function () {
  // Health check (what the frontend polls)
  const health = http.get(`${BASE_URL}/health`, {
    tags: { name: 'health' },
  });
  check(health, { 'health ok': (r) => r.status === 200 });

  // Readiness check
  const ready = http.get(`${BASE_URL}/ready`, {
    tags: { name: 'ready' },
  });
  check(ready, { 'ready responds': (r) => r.status === 200 || r.status === 503 });

  // Initial data load (what happens right after backend is ready)
  const matches = http.get(`${BASE_URL}/matches/all`, {
    tags: { name: 'matches' },
  });
  check(matches, { 'matches loaded': (r) => r.status === 200 });

  const leaderboard = http.get(`${BASE_URL}/predictions/leaderboard`, {
    tags: { name: 'leaderboard' },
  });
  check(leaderboard, { 'leaderboard loaded': (r) => r.status === 200 });

  // Minimal delay — clients reconnect aggressively
  sleep(Math.random() * 0.1);
}
