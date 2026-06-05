import { APIRequestContext, Page, expect } from '@playwright/test';
import { API_URL } from '../../playwright.config';
import { seedSavedNation } from './picker';

export interface TestUser {
  username: string;
  email: string;
  password: string;
  country: string;
}

/**
 * Build a unique test user. Username must match the backend rule
 * (^[a-zA-Z0-9_]{3,20}$) and password must be >= 8 chars.
 *
 * `seed` keeps usernames unique across parallel specs without relying on
 * Date.now()/Math.random() at import time. Pass a per-test discriminator.
 */
export function makeTestUser(seed: string): TestUser {
  const safe = seed.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 12) || 'user';
  const name = `e2e_${safe}`.slice(0, 20);
  return {
    username: name,
    // `.test` is a reserved TLD that pydantic EmailStr rejects — use example.com.
    email: `${name}@example.com`,
    password: 'TestPassw0rd!',
    country: 'Brazil',
  };
}

/**
 * Register a user via the API. Tolerates "already registered" (400) so specs
 * are re-runnable against a persistent SQLite db.
 */
export async function registerUser(request: APIRequestContext, user: TestUser): Promise<void> {
  const res = await request.post(`${API_URL}/register`, {
    data: {
      username: user.username,
      email: user.email,
      password: user.password,
      country_allegiance: user.country,
    },
  });
  if (!res.ok() && res.status() !== 400) {
    throw new Error(`register failed: ${res.status()} ${await res.text()}`);
  }
}

/**
 * Drive the real /login form: fill credentials, submit, and wait for the
 * client-side navigation away from /login to settle.
 */
export async function loginViaUI(page: Page, user: TestUser): Promise<void> {
  // The global "Pick Your Nation" modal renders app-wide (including /login) and
  // would intercept clicks — seed a saved nation so it stays closed.
  await seedSavedNation(page);
  await page.goto('/login');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.getByLabel('Username').fill(user.username);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: 'Enter the Hub' }).click();
  // Wait for the access-token request to the API to resolve.
  await expect
    .poll(async () => page.url(), { timeout: 10_000 })
    .not.toContain('/login?error');
}
