/**
 * Final whistle burst — simulates everyone checking leaderboard + scores.
 *
 * Scenario: 200 VUs hammer leaderboard and match endpoints for 30 seconds.
 * Tests read throughput under extreme load.
 * Run: k6 run load-tests/burst-whistle.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, THRESHOLDS } from './common.js';

export const options = {
  scenarios: {
    whistle_burst: {
      executor: 'constant-vus',
      vus: 200,
      duration: '30s',
    },
  },
  thresholds: {
    ...THRESHOLDS,
    'http_req_duration{name:leaderboard}': ['p(95)<1000'],
    'http_req_duration{name:matches}': ['p(95)<500'],
  },
};

export default function () {
  // Leaderboard (heaviest read endpoint)
  const lb = http.get(`${BASE_URL}/predictions/leaderboard`, {
    tags: { name: 'leaderboard' },
  });
  check(lb, { 'leaderboard 200': (r) => r.status === 200 });

  // Match list
  const matches = http.get(`${BASE_URL}/matches/all`, {
    tags: { name: 'matches' },
  });
  check(matches, { 'matches 200': (r) => r.status === 200 });

  // Squad lookups (random teams)
  const teams = ['Argentina', 'Brazil', 'France', 'Germany', 'England', 'Spain'];
  const team = teams[Math.floor(Math.random() * teams.length)];
  const squad = http.get(`${BASE_URL}/squad/${team}`, {
    tags: { name: 'squad' },
  });
  check(squad, { 'squad 200': (r) => r.status === 200 });

  sleep(Math.random() * 0.3);
}
