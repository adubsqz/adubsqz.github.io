import { expect, test, type Page } from '@playwright/test';
import { contactSheetEagerFrameCount } from '../src/gallery-layout';

const VIEWPORTS = [
  // Budgets ≈ first collage viewport + a little scroll lead (sheet thumbs only).
  { name: 'desktop', width: 1280, height: 800, firstStillMs: 8000, maxUniqueStills: 24 },
  { name: 'mobile', width: 390, height: 844, firstStillMs: 10000, maxUniqueStills: 12 },
] as const;

function collectPhotoUrls(page: Page): { sheet: Set<string>; full: Set<string> } {
  const sheet = new Set<string>();
  const full = new Set<string>();
  page.on('response', (res) => {
    if (!res.ok()) return;
    const url = res.url().split('?')[0] ?? '';
    if (url.includes('/photos/sheet/')) sheet.add(url);
    if (url.includes('/photos/still-life/')) full.add(url);
  });
  return { sheet, full };
}

async function firstGalleryImage(page: Page) {
  return page.locator('img[src*="/photos/sheet/"]').first();
}

for (const vp of VIEWPORTS) {
  test.describe(`gallery load (${vp.name})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test(`first still is fast, lazy below the fold, and the chrome stays simple`, async ({
      page,
    }) => {
      const photoUrls = collectPhotoUrls(page);
      const started = Date.now();
      await page.goto('/', { waitUntil: 'domcontentloaded' });

      await expect(page.getByRole('heading', { name: 'adubsqz' })).toBeVisible();
      await expect(page.getByRole('button', { name: /^work$/i })).toHaveAttribute('aria-pressed', 'true');
      await expect(page.getByRole('button', { name: /^about$/i })).toBeVisible();
      await expect(page.getByRole('img', { name: /printable film photography/i })).toHaveCount(0);
      await expect(page.getByRole('navigation', { name: /collections/i })).toHaveCount(0);
      await expect(page.getByRole('button', { name: /^gallery$/i })).toHaveCount(0);
      await expect(page.getByRole('button', { name: /about me/i })).toHaveCount(0);

      const header = page.locator('header.site-header');
      await expect(header).not.toHaveCSS('position', 'sticky');

      const img = await firstGalleryImage(page);
      await expect(img).toBeVisible();
      await expect
        .poll(async () => img.evaluate((el) => el instanceof HTMLImageElement && el.complete && el.naturalWidth > 0))
        .toBe(true);

      const elapsed = Date.now() - started;
      expect(elapsed, `${vp.name} first still took ${elapsed}ms`).toBeLessThan(vp.firstStillMs);

      await expect(img).toHaveAttribute('loading', 'eager');
      await expect(img).toHaveAttribute('fetchpriority', 'high');

      const preloads = page.locator('link[rel="preload"][as="image"]');
      const frameCount = await page.getByRole('button', { name: /open photo/i }).count();
      const expectedPreloads = Math.min(contactSheetEagerFrameCount(vp.width), frameCount);
      await expect(preloads).toHaveCount(expectedPreloads);
      if (expectedPreloads > 0) {
        await expect(preloads.first()).toHaveAttribute('fetchpriority', 'high');
        await expect(preloads.first()).toHaveAttribute('href', /\/photos\/sheet\//);
      }

      const photoButton = page.getByRole('button', { name: /open photo/i }).first();
      await expect(photoButton).toBeVisible();
      const box = await photoButton.boundingBox();
      expect(box, `${vp.name} first frame should be on screen`).not.toBeNull();
      expect(box!.x, `${vp.name} first still should hug the left edge`).toBeLessThanOrEqual(8);
      const brand = await page.getByRole('button', { name: 'adubsqz' }).boundingBox();
      expect(brand, `${vp.name} wordmark missing`).not.toBeNull();
      expect(brand!.x + brand!.width, `${vp.name} wordmark overflows`).toBeLessThanOrEqual(vp.width + 8);

      await page.waitForTimeout(750);
      expect(
        photoUrls.full.size,
        `${vp.name} fetched ${photoUrls.full.size} full stills before lightbox (want 0)`,
      ).toBe(0);
      expect(
        photoUrls.sheet.size,
        `${vp.name} fetched ${photoUrls.sheet.size} sheet thumbs on first paint (budget ${vp.maxUniqueStills})`,
      ).toBeLessThanOrEqual(vp.maxUniqueStills);
      expect(photoUrls.sheet.size).toBeGreaterThan(0);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      );
      expect(overflow, `${vp.name} has horizontal overflow`).toBe(false);
      const loadLine = `${vp.name} firstStill=${elapsed}ms sheet=${photoUrls.sheet.size} full=${photoUrls.full.size} overflow=${overflow} firstY=${Math.round(box!.y)} viewport=${vp.height}`;
      console.log(loadLine);
      test.info().annotations.push({
        type: 'load',
        description: loadLine,
      });
      expect(box!.y, `${vp.name} chrome pushed the first frame down`).toBeLessThan(vp.height * 0.45);
      expect(box!.y + 48, `${vp.name} first frame off screen`).toBeLessThan(vp.height);

      expect(await page.locator('.lookbook-cell').count()).toBeGreaterThan(8);
      expect(await page.locator('.film-strip').count()).toBe(0);
    });
  });
}
