import { Page } from '@playwright/test';

/**
 * The app shows a global, full-screen "Pick Your Nation" modal (TeamPicker)
 * on the first visit when no `fanxi_team` is saved in localStorage. It covers
 * the whole viewport (z-50, opaque bg) and blocks ALL interaction until a
 * nation is chosen — there is no Cancel until a team already exists.
 *
 * For tests that need to interact with the page underneath, seed a saved team
 * BEFORE the app boots so the picker never opens (mirrors a returning user).
 */
export async function seedSavedNation(page: Page, teamId = 'brazil'): Promise<void> {
  await page.addInitScript((id) => {
    try {
      window.localStorage.setItem('fanxi_team', id);
    } catch {
      /* storage unavailable — ignore */
    }
  }, teamId);
}

/**
 * Live alternative: if the picker is open, pick the first available nation to
 * dismiss it. Use when you specifically want to exercise the picker flow.
 */
export async function chooseNationIfPrompted(page: Page): Promise<void> {
  const picker = page.getByRole('heading', { name: /Pick Your Nation/i });
  if (await picker.isVisible().catch(() => false)) {
    await page.getByRole('button', { name: /Brazil/i }).first().click();
  }
}
