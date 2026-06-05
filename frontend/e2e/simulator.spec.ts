import { test, expect } from '@playwright/test';
import { seedSavedNation, chooseNationIfPrompted } from './helpers/picker';

/**
 * The simulator is public (not auth-gated). It's the most data-heavy public
 * page, so it's a good signal that the frontend↔backend wiring is healthy.
 *
 * NOTE: a fresh browser triggers the global "Pick Your Nation" modal, which
 * blocks all interaction. We seed a saved nation so the picker stays closed
 * (returning-user path). See e2e/helpers/picker.ts.
 */
test.describe('World Cup 2026 simulator', () => {
  test.beforeEach(async ({ page }) => {
    await seedSavedNation(page);
  });

  test('renders the simulator heading and group stage', async ({ page }) => {
    await page.goto('/simulator');
    await expect(
      page.getByRole('heading', { name: /WORLD CUP 2026 SIMULATOR/i }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: /Group Stage/i })).toBeVisible();
  });

  test('reset bracket control is present and clickable', async ({ page }) => {
    await page.goto('/simulator');
    const reset = page.getByRole('button', { name: /Reset Bracket/i });
    await expect(reset).toBeVisible();
    await reset.click();
    // Page should remain on the simulator after reset (no crash / no redirect).
    await expect(page).toHaveURL(/\/simulator/);
  });
});

test.describe('first-run team picker', () => {
  test('fresh visit shows the Pick Your Nation modal and can be dismissed', async ({ page }) => {
    // No seeded nation here — exercise the real first-run gate.
    await page.goto('/simulator');
    await expect(page.getByRole('heading', { name: /Pick Your Nation/i })).toBeVisible();
    await chooseNationIfPrompted(page);
    await expect(page.getByRole('heading', { name: /Pick Your Nation/i })).toBeHidden();
  });
});
