import { test, expect } from '@playwright/test';

/**
 * Smoke test: the login page renders.
 *
 * Kept intentionally loose while app services are stubbed — asserts the
 * page loads and shows a credential form, not specific copy (tenant
 * terminology/branding can change labels).
 */
test.describe('login page', () => {
  test('renders the login form', async ({ page }) => {
    const response = await page.goto('/login');
    expect(response?.ok()).toBeTruthy();

    // Email + password inputs and a submit control must be present.
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]').first()).toBeVisible();
    await expect(page.locator('button[type="submit"]').first()).toBeVisible();
  });

  test('has a page title', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/.+/);
  });
});
