import { test, expect } from '@playwright/test';

test.describe('smoke', () => {
  test('loads the app and switches between Work and About', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('button', { name: /^gallery$/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'adubsqz' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^work$/i })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: /about me/i })).toHaveCount(0);
    await expect(page.getByLabel(/password/i)).toHaveCount(0);
    await expect(page.getByRole('img', { name: /printable film photography/i })).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: /collections/i })).toHaveCount(0);

    await page.getByRole('button', { name: /^about$/i }).click();
    await expect(page.getByRole('button', { name: /^about$/i })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText(/I take 35mm and medium format film photography/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /let's talk/i })).toBeVisible();

    await page.getByRole('button', { name: /^work$/i }).click();
    await expect(page.getByRole('button', { name: /^work$/i })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: /open photo/i }).first()).toBeVisible();
  });
});
