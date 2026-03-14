/**
 * Steady load test — simulates normal browsing traffic.
 *
 * Scenario: 50 VUs browse homepage, matches, leaderboard for 2 minutes.
 * Run: k6 run load-tests/steady.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, THRESHOLDS } from './common.js';

export const options = {
  stages: [
    { duration: '15s', target: 20 },   // ramp up
    { duration: '90s', target: 50 },   // steady
    { duration: '15s', target: 0 },    // ramp down
  ],
  thresholds: THRESHOLDS,
};

export default function () {
  // Health check
  const health = http.get(`${BASE_URL}/health`);
  check(health, { 'health 200': (r) => r.status === 200 });

  // Browse all matches
  const matches = http.get(`${BASE_URL}/matches/all`);
  check(matches, {
    'matches 200': (r) => r.status === 200,
    'matches has 72': (r) => r.json().length === 72,
  });

  // Leaderboard
  const leaderboard = http.get(`${BASE_URL}/predictions/leaderboard`);
  check(leaderboard, { 'leaderboard 200': (r) => r.status === 200 });

  // Squad lookup
  const squad = http.get(`${BASE_URL}/squad/Argentina`);
  check(squad, {
    'squad 200': (r) => r.status === 200,
    'squad static': (r) => r.json().source === 'static',
  });

  sleep(Math.random() * 2 + 1); // 1-3s think time
}
