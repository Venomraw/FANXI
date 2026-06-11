import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for genuinely public routes — pages that render for a
 * logged-out visitor and never redirect to /login.
 *
 * NOTE: /nation and /ai are intentionally NOT here. Despite living outside the
 * (protected) group, both have their own page-level guard that redirects
 * logged-out users to /login (nation/page.tsx, ai/page.tsx). They are covered
 * as "self-guarded" routes in auth.spec.ts instead.
 */
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/simulator',
  '/leaderboard',
  '/guide',
  '/matches',
  '/nations/argentina',
  '/forgot-password',
];

test.describe('public routes render', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`GET ${route} loads without redirect to /login`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));

      const res = await page.goto(route, { waitUntil: 'networkidle' });
      expect(res?.status(), `HTTP status for ${route}`).toBeLessThan(400);

      // Let any client-side guard (which fires after the silent /auth/refresh
      // resolves) have its chance, so this assertion is not a timing fluke.
      await page.waitForTimeout(1500);

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
