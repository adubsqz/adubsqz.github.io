import { expect, test } from '@playwright/test';
import { revealAllStills } from './reveal-stills';

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 390, height: 844 },
] as const;

for (const vp of VIEWPORTS) {
  test.describe(`gallery lookbook (${vp.name})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test('pads every still evenly and does not page', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('button', { name: /open photo/i }).first()).toBeVisible();
      await expect(page.getByRole('button', { name: /next page/i })).toHaveCount(0);
      await expect(page.getByText(/^\d+ of \d+$/)).toHaveCount(0);

      const lookbook = page.locator('.gallery-lookbook');
      await expect(lookbook).toBeVisible();
      const inset = await lookbook.evaluate((el) => {
        const s = getComputedStyle(el);
        return {
          top: parseFloat(s.paddingTop),
          right: parseFloat(s.paddingRight),
          bottom: parseFloat(s.paddingBottom),
          left: parseFloat(s.paddingLeft),
        };
      });
      expect(inset.top).toBeGreaterThanOrEqual(23);
      expect(inset.right).toBe(inset.top);
      expect(inset.bottom).toBe(inset.top);
      expect(inset.left).toBe(inset.top);

      const still = page.locator('.gallery-still').first();
      const box = await still.boundingBox();
      expect(box, `${vp.name} first still missing box`).not.toBeNull();
      expect(box!.x, `${vp.name} still flush to the left`).toBeGreaterThanOrEqual(inset.left - 1);
      expect(box!.x + box!.width, `${vp.name} still flush to the right`).toBeLessThanOrEqual(
        vp.width - inset.right + 1,
      );

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      );
      expect(overflow, `${vp.name} has horizontal overflow`).toBe(false);
    });

    test('keeps collection nav stuck to the top after scroll', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('navigation', { name: /collections/i })).toBeVisible();
      const header = page.locator('header.site-header');
      await expect(header).toHaveCSS('position', 'sticky');
      await page.evaluate(() => window.scrollTo(0, 900));
      const top = await header.evaluate((el) => el.getBoundingClientRect().top);
      expect(top, `${vp.name} header left the top`).toBeLessThanOrEqual(1);
      await expect(page.getByRole('navigation', { name: /collections/i })).toBeVisible();
    });

    test('portraits lookbook keeps stills two and three in one scroll', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: /^portraits$/i }).click();
      await expect(page.locator('.gallery-still')).toHaveCount(14);
      await expect(page.getByRole('button', { name: /next page/i })).toHaveCount(0);
      await revealAllStills(page);
      await expect(page.locator('img[src*="sweetener-tour"]')).toHaveCount(1);
      await expect(page.locator('img[src*="sangerhall"]')).toHaveCount(1);
      await expect(page.getByRole('button', { name: /open photo/i })).toHaveCount(14, { timeout: 10_000 });
    });

    test('full spectrum lookbook includes the imported color stills', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: /^full spectrum$/i }).click();
      await expect(page.locator('.gallery-still')).toHaveCount(15);
      await revealAllStills(page);
      await expect(page.locator('img[src*="hospitalwindows"]')).toHaveCount(1);
      await expect(page.locator('img[src*="colorfulhousegreenery"]')).toHaveCount(1);
    });
  });
}
