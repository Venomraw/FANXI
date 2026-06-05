import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for public (non-auth-gated) routes. These must render
 * without redirecting to /login and without a client-side crash.
 */
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/simulator',
  '/leaderboard',
  '/guide',
  '/matches',
  '/nation',
  '/forgot-password',
];

test.describe('public routes render', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`GET ${route} loads without redirect to /login`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));

      const res = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(res?.status(), `HTTP status for ${route}`).toBeLessThan(400);

      // Public routes must NOT be bounced to login by middleware.
      if (route !== '/login') {
        expect(page.url(), `${route} should not redirect to /login`).not.toContain('/login');
      }

      expect(errors, `uncaught page errors on ${route}`).toEqual([]);
    });
  }
});

test('landing page shows the FanXI brand', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/FanXI|Fan\s*XI/i).first()).toBeVisible();
});
