import { expect, test } from '@playwright/test';
import { revealAllStills } from './reveal-stills';

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 390, height: 844 },
] as const;

for (const vp of VIEWPORTS) {
  test.describe(`lookbook collage (${vp.name})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test('shows a gate-style photo grid with no film-strip chrome', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('button', { name: /open photo/i }).first()).toBeVisible();
      await expect(page.getByRole('button', { name: /next page/i })).toHaveCount(0);
      await expect(page.getByRole('navigation', { name: /collections/i })).toHaveCount(0);

      const collage = page.locator('.lookbook-collage');
      await expect(collage).toBeVisible();
      await expect(page.locator('.film-strip')).toHaveCount(0);
      await expect(page.locator('.film-sprockets')).toHaveCount(0);
      await expect(page.locator('.lookbook-cell').first()).toBeVisible();

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      );
      expect(overflow, `${vp.name} has horizontal overflow`).toBe(false);

      const frames = page.locator('.lookbook-cell');
      expect(await frames.count()).toBeGreaterThan(8);
      await expect(page.getByText('KODAK', { exact: true })).toHaveCount(0);
    });

    test('keeps the same aesthetic frame order after reload', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      const labels = page.getByRole('button', { name: /open photo/i });
      await expect(labels.first()).toBeVisible();
      const before = await labels.evaluateAll((buttons) =>
        buttons.map((button) => button.getAttribute('aria-label') ?? ''),
      );
      expect(before.length).toBeGreaterThan(2);

      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(labels.first()).toBeVisible();
      const after = await labels.evaluateAll((buttons) =>
        buttons.map((button) => button.getAttribute('aria-label') ?? ''),
      );
      expect(after).toEqual(before);
    });

    test('lets the header scroll away', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      const header = page.locator('header.site-header');
      await expect(header).not.toHaveCSS('position', 'sticky');
      await page.evaluate(() => window.scrollTo(0, 900));
      const top = await header.evaluate((el) => el.getBoundingClientRect().top);
      const canScroll = await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight + 40);
      if (canScroll) {
        expect(top, `${vp.name} header stayed on screen`).toBeLessThan(0);
      }
    });

    test('one collage includes color and people stills', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await revealAllStills(page);
      await expect(page.locator('.lookbook-collage img[src*="hospitalwindows"]')).toHaveCount(1);
      await expect(page.locator('.lookbook-collage img[src*="sweetener-tour"]')).toHaveCount(1);
      await expect(page.locator('.lookbook-collage img[src*="sangerhall"]')).toHaveCount(1);
      await expect(page.locator('.lookbook-cell').first()).toBeVisible();
    });
  });
}
