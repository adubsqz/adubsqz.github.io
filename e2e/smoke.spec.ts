import { test, expect } from '@playwright/test';

test.describe('smoke', () => {
  test('loads the app and switches between Gallery and About', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('button', { name: /^gallery$/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'adubsqz' })).toBeVisible();
    await expect(page.locator('.brand-mark .graffiti-label--on')).toHaveAttribute('data-tone', 'pink');
    await expect(page.getByRole('button', { name: /about me/i })).toHaveCount(0);
    await expect(page.getByLabel(/password/i)).toHaveCount(0);
    const tagline = page.getByRole('img', {
      name: /printable film photography as small as a locket for ur momma/i,
    });
    await expect(tagline).toBeVisible();
    await expect(tagline).toHaveAttribute('src', '/tagline.jpg');

    await page.getByRole('button', { name: 'adubsqz' }).click();
    await expect(page.getByRole('button', { name: 'adubsqz' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText(/I am not an AI robot/i)).toBeVisible();
    const talk = page.getByRole('button', { name: /let's talk/i });
    await expect(talk).toBeVisible();
    await expect(talk.locator('.graffiti-label--on')).toHaveAttribute('data-tone', 'pink');
    await expect(talk.locator('.graffiti-label__core')).toHaveCSS('color', 'rgb(243, 182, 200)');

    await page.getByRole('button', { name: 'adubsqz' }).click();
    await expect(page.getByRole('button', { name: 'adubsqz' })).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByRole('navigation', { name: /collections/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /greyscale/i })).toBeVisible();
  });
});
