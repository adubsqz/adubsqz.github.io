import { expect, test } from '@playwright/test';
import { revealAllStills } from './reveal-stills';

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 390, height: 844 },
] as const;

for (const vp of VIEWPORTS) {
  test.describe(`contact sheet (${vp.name})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test('shows one frame, a thumb strip, and no category chrome', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('button', { name: /open photo/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /next page/i })).toHaveCount(0);
      await expect(page.getByRole('navigation', { name: /collections/i })).toHaveCount(0);

      const sheet = page.locator('.contact-sheet');
      await expect(sheet).toBeVisible();
      const bg = await sheet.evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(bg).toBe('rgb(255, 255, 255)');

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      );
      expect(overflow, `${vp.name} has horizontal overflow`).toBe(false);

      const strip = page.locator('.contact-thumbs');
      const stripOverflow = await strip.evaluate((el) => el.scrollWidth > el.clientWidth + 1);
      expect(stripOverflow, `${vp.name} thumb strip should scroll inside itself`).toBe(true);
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

    test('one sheet includes color and people stills', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await revealAllStills(page);
      await expect(page.locator('img[src*="hospitalwindows"]')).toHaveCount(1);
      await expect(page.locator('img[src*="sweetener-tour"]')).toHaveCount(1);
      await expect(page.locator('img[src*="sangerhall"]')).toHaveCount(1);
      await expect(page.getByRole('button', { name: /open photo/i })).toHaveCount(1);
    });
  });
}
