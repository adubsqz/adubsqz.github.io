import { test, expect } from '@playwright/test';

test.describe('smoke', () => {
  test('loads Work, Portfolio, and About on grain', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('button', { name: /^gallery$/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'adubsqz' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^work$/i })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('makers-space')).toBeVisible();
    await expect(page.getByTestId('makers-seat')).toHaveCount(7);
    await expect(page.getByRole('button', { name: /about me/i })).toHaveCount(0);
    await expect(page.getByLabel(/password/i)).toHaveCount(0);

    await page.getByRole('button', { name: /^portfolio$/i }).click();
    await expect(page.getByRole('button', { name: /^portfolio$/i })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: /open photo/i }).first()).toBeVisible();
    expect(await page.getByRole('button', { name: /open photo/i }).count()).toBeGreaterThan(7);

    await page.getByRole('button', { name: /^about$/i }).click();
    await expect(page.getByRole('button', { name: /^about$/i })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('about-view')).toBeVisible();
    await expect(page.getByTestId('about-xl-logo')).toBeVisible();
    await expect(page.getByText(/I take 35mm and medium format film photography/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /let's talk/i })).toBeVisible();

    await page.getByRole('button', { name: /^work$/i }).click();
    await expect(page.getByRole('button', { name: /^work$/i })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('makers-seat')).toHaveCount(7);
  });
});
