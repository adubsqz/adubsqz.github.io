import { test, expect } from '@playwright/test';
import { SITE_HOST } from '../src/site';

test.describe('site', () => {
  test('work horseshoe, portfolio sheet, about grain, and contact', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('button', { name: /^gallery$/i })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'adubsqz' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^work$/i })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: /^portfolio$/i })).toBeVisible();
    await expect(page.getByTestId('makers-space')).toHaveAttribute('data-ground', 'grain-paper');
    await expect(page.getByTestId('makers-seat')).toHaveCount(7);

    await page.getByRole('button', { name: /^portfolio$/i }).click();
    await expect(page.getByRole('region', { name: /portfolio/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /open photo/i }).first()).toBeVisible();
    expect(await page.getByRole('button', { name: /open photo/i }).count()).toBeGreaterThan(7);

    // Sheet thumbs are small JPEGs without © burn-in; Portfolio cells must still show CSS overlays.
    const portfolioImgs = page.locator('.lookbook-collage img.gallery-image');
    const painted = await portfolioImgs.count();
    expect(painted).toBeGreaterThan(0);
    for (let i = 0; i < Math.min(painted, 8); i += 1) {
      await portfolioImgs.nth(i).evaluate((img: HTMLImageElement) => {
        if (img.complete) img.dispatchEvent(new Event('load'));
      });
    }
    await expect(page.getByText(/^adubsqz$/i).first()).toBeVisible();

    await page.getByRole('button', { name: /open photo/i }).first().click();
    const lightbox = page.getByRole('dialog', { name: /image lightbox/i });
    await expect(lightbox).toBeVisible();
    const lightboxImg = lightbox.locator('img');
    await lightboxImg.evaluate((img: HTMLImageElement) => {
      if (img.complete) img.dispatchEvent(new Event('load'));
    });
    await expect(lightbox.getByText(/^adubsqz$/i)).toHaveCount(1);
    await page.getByRole('button', { name: /^close$/i }).first().click();
    await expect(lightbox).toHaveCount(0);

    await page.getByRole('button', { name: /^about$/i }).click();
    await expect(page.getByRole('button', { name: /^about$/i })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('about-view')).toHaveClass(/about-on-grain/);
    await expect(page.getByTestId('about-xl-logo')).toBeVisible();
    await expect(page.locator('.proof-plate__frame')).toBeVisible();
    await expect(page.getByText(/I take 35mm and medium format film photography/i)).toBeVisible();
    await expect(page.getByText(/AWS Certified AI Practitioner/i)).toBeVisible();
    await expect(page.getByText(/Need a print, a license, or a site/i)).toBeVisible();
    await expect(page.getByText(/rights reserved/i)).toBeVisible();
    const instagram = page.getByRole('link', { name: /^instagram$/i });
    await expect(instagram).toBeVisible();
    await expect(instagram).toHaveAttribute('href', 'https://www.instagram.com/adubsqz/');
    await expect(page.getByRole('link', { name: SITE_HOST }).first()).toBeVisible();

    const talk = page.getByRole('button', { name: /let's talk/i });
    await talk.click();
    await expect(page.getByRole('dialog', { name: /contact/i })).toBeVisible();
    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByRole('dialog', { name: /contact/i })).toHaveCount(0);

    await page.getByRole('button', { name: /^work$/i }).click();
    await expect(page.getByTestId('makers-seat')).toHaveCount(7);
  });
});
