import { defineConfig, devices } from '@playwright/test';

/**
 * FanXI E2E config.
 *
 * Servers are started manually (per project decision):
 *   backend  →  cd backend && python run.py --dev          (http://localhost:8000)
 *   frontend →  cd frontend && npm run dev                 (http://localhost:3000)
 *
 * Then:  cd frontend && npx playwright test
 */
export const FRONTEND_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:8000';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 30_000,
  expect: { timeout: 7_000 },

  use: {
    baseURL: FRONTEND_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
