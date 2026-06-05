import { test, expect } from '@playwright/test';
import { makeTestUser, registerUser, loginViaUI } from './helpers/auth';

test.describe('auth gate (client-side guard)', () => {
  // Protected routes are guarded by app/(app)/(protected)/layout.tsx. The guard
  // waits for the silent /auth/refresh to resolve, then redirects to
  // /login?next=<path> when there is no authenticated user.
  test('logged-out user is redirected from /hub to /login with ?next', async ({ page }) => {
    await page.goto('/hub');
    await expect(page).toHaveURL(/\/login\?next=%2Fhub|\/login\?next=\/hub/, { timeout: 10_000 });
  });

  test('logged-out user is redirected from /predict to /login', async ({ page }) => {
    await page.goto('/predict');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test('logged-out user is redirected from /profile to /login', async ({ page }) => {
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});

test.describe('public routes are NOT over-guarded', () => {
  // Regression guard: the (protected) layout must wrap ONLY protected routes.
  // Public/SEO routes under (app) must stay reachable while logged out.
  for (const route of ['/matches', '/nation', '/ai']) {
    test(`logged-out user can load ${route} (no redirect to /login)`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      // Give any (incorrect) client-side guard a chance to fire before asserting.
      await page.waitForTimeout(1500);
      expect(page.url(), `${route} should stay reachable when logged out`).not.toContain('/login');
    });
  }
});

test.describe('real login flow', () => {
  test('after login the user can reach a protected route (/hub)', async ({
    page,
    request,
  }, testInfo) => {
    const user = makeTestUser(`login${testInfo.workerIndex}`);
    await registerUser(request, user);

    await loginViaUI(page, user);

    // Login itself succeeds — it does not bounce straight back to /login.
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });

    // The logged-in user must be able to open a protected route. This is the
    // end-to-end proof that the client-side guard recognises the session.
    await page.goto('/hub');
    await expect(page).toHaveURL(/\/hub/, { timeout: 10_000 });
  });
});
