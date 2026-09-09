import { expect, test, type Page } from '@playwright/test';

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800, firstStillMs: 8000, maxUniqueStills: 6 },
  { name: 'mobile', width: 390, height: 844, firstStillMs: 10000, maxUniqueStills: 4 },
] as const;

function collectStillUrls(page: Page): Set<string> {
  const urls = new Set<string>();
  page.on('response', (res) => {
    if (!res.ok()) return;
    const url = res.url().split('?')[0] ?? '';
    if (url.includes('/photos/still-life/')) urls.add(url);
  });
  return urls;
}

async function firstGalleryImage(page: Page) {
  return page.locator('img[src*="still-life"]').first();
}

for (const vp of VIEWPORTS) {
  test.describe(`gallery load (${vp.name})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test(`first still is fast, lazy below the fold, and the chrome stays simple`, async ({
      page,
    }) => {
      const stillUrls = collectStillUrls(page);
      const started = Date.now();
      await page.goto('/', { waitUntil: 'domcontentloaded' });

      await expect(page.getByRole('tab', { name: /^gallery$/i })).toBeVisible();
      await expect(page.getByRole('tab', { name: /about me/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /greyscale|full spectrum|redscale|people/i }).first()).toBeVisible();

      const img = await firstGalleryImage(page);
      await expect(img).toBeVisible();
      await expect
        .poll(async () => img.evaluate((el) => el instanceof HTMLImageElement && el.complete && el.naturalWidth > 0))
        .toBe(true);

      const elapsed = Date.now() - started;
      expect(elapsed, `${vp.name} first still took ${elapsed}ms`).toBeLessThan(vp.firstStillMs);

      await expect(img).toHaveAttribute('loading', 'eager');
      await expect(img).toHaveAttribute('fetchpriority', 'high');

      const photoButton = page.getByRole('button', { name: /open photo/i }).first();
      await expect(photoButton).toBeVisible();
      const box = await photoButton.boundingBox();
      expect(box, `${vp.name} first frame should be on screen`).not.toBeNull();
      expect(box!.y, `${vp.name} chrome pushed the first frame down`).toBeLessThan(vp.height * 0.72);
      expect(box!.x, `${vp.name} first still flush left`).toBeGreaterThanOrEqual(12);

      await page.waitForTimeout(750);
      expect(
        stillUrls.size,
        `${vp.name} fetched ${stillUrls.size} stills on first paint (budget ${vp.maxUniqueStills})`,
      ).toBeLessThanOrEqual(vp.maxUniqueStills);
      expect(stillUrls.size).toBeGreaterThan(0);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      );
      expect(overflow, `${vp.name} has horizontal overflow`).toBe(false);
    });
  });
}
