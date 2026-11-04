import { test, expect } from '@playwright/test';
import { SITE_HOST } from '../src/site';

test.describe('site', () => {
  test('makers space horseshoe, about, and contact', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('button', { name: /^gallery$/i })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'adubsqz' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^work$/i })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('makers-space')).toHaveAttribute('data-ground', 'grain-paper');
    await expect(page.getByTestId('makers-seat')).toHaveCount(7);
    await expect(page.getByRole('img', { name: /printable film photography/i })).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: /collections/i })).toHaveCount(0);
    await expect(page.getByText(/hidden obstacles|people's attitudes|the advice/i)).toHaveCount(0);

    await page.getByTestId('makers-seat').first().click();
    const lightbox = page.getByRole('dialog').first();
    await expect(lightbox).toBeVisible();
    await page.getByRole('button', { name: /^close$/i }).click();
    await expect(lightbox).toHaveCount(0);

    await page.getByRole('button', { name: /^about$/i }).click();
    await expect(page.getByRole('button', { name: /^about$/i })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText(/I take 35mm and medium format film photography/i)).toBeVisible();
    await expect(page.getByText(/AWS Certified AI Practitioner/i)).toBeVisible();
    await expect(page.getByText(/Need a print, a license, or a site/i)).toBeVisible();
    await expect(page.getByText(/rights reserved/i)).toBeVisible();
    const instagram = page.getByRole('link', { name: /^instagram$/i });
    await expect(instagram).toBeVisible();
    await expect(instagram).toHaveAttribute('href', 'https://www.instagram.com/adubsqz/');
    await expect(instagram).toHaveAttribute('target', '_blank');
    await expect(page.getByRole('link', { name: SITE_HOST }).first()).toBeVisible();

    const talk = page.getByRole('button', { name: /let's talk/i });
    await expect(talk).toBeVisible();
    await talk.click();
    await expect(page.getByRole('dialog', { name: /contact/i })).toBeVisible();
    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByRole('dialog', { name: /contact/i })).toHaveCount(0);

    await page.getByRole('button', { name: /^work$/i }).click();
    await expect(page.getByTestId('makers-seat')).toHaveCount(7);
  });
});
