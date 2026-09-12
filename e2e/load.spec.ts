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

      await expect(page.getByRole('heading', { name: 'adubsqz' })).toBeVisible();
      await expect(
        page.getByRole('img', { name: /printable film photography as small as a locket for ur momma/i }),
      ).toBeVisible();
      await expect(page.getByRole('navigation', { name: /collections/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /greyscale/i })).toHaveAttribute('aria-pressed', 'true');
      await expect(page.getByRole('button', { name: /full spectrum/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /redscale/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /^portraits$/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /^gallery$/i })).toHaveCount(0);
      await expect(page.getByRole('button', { name: /about me/i })).toHaveCount(0);
      await expect(page.locator('.brand-mark .graffiti-label__core')).toHaveCSS('color', 'rgb(243, 182, 200)');
      await expect(page.getByRole('button', { name: /greyscale/i }).locator('.graffiti-label__core')).toHaveCSS(
        'color',
        'rgb(243, 225, 138)',
      );
      const unselectedCore = page.getByRole('button', { name: /^portraits$/i }).locator('.graffiti-label__core');
      await expect(unselectedCore).toHaveCSS('color', 'rgb(26, 23, 20)');
      const unselectedPaint = await unselectedCore.evaluate((el) => {
        const style = getComputedStyle(el);
        return { color: style.color, shadow: style.textShadow };
      });
      expect(unselectedPaint.color).not.toBe('rgb(255, 255, 255)');
      expect(unselectedPaint.shadow).toMatch(/244,\s*238,\s*228/);
      const unselectedThrow = await page
        .getByRole('button', { name: /^portraits$/i })
        .locator('.graffiti-label__throw')
        .evaluate((el) => {
          const style = getComputedStyle(el);
          return { color: style.color, fill: style.webkitTextFillColor };
        });
      expect(unselectedThrow.color).toBe('rgba(0, 0, 0, 0)');
      expect(unselectedThrow.fill === 'rgba(0, 0, 0, 0)' || unselectedThrow.fill === '').toBeTruthy();
      const tagline = page.locator('.site-tagline img');
      await expect(tagline).toBeVisible();
      await expect(tagline).toHaveAttribute('src', '/tagline.jpg');
      const taglineBox = await tagline.boundingBox();
      expect(taglineBox, `${vp.name} tagline missing`).not.toBeNull();
      expect(taglineBox!.height, `${vp.name} tagline taller than two padded lines`).toBeLessThan(
        vp.name === 'mobile' ? 80 : 180,
      );

      const reel = page.locator('.collection-reel');
      const reelLayout = await reel.evaluate((el) => {
        const kids = [...el.querySelectorAll('h2')];
        const style = getComputedStyle(el);
        return {
          wrap: style.flexWrap,
          overflowX: style.overflowX,
          scrollbarWidth: style.scrollbarWidth,
          tops: kids.map((kid) => (kid as HTMLElement).offsetTop),
        };
      });
      expect(reelLayout.wrap, `${vp.name} collection reel wraps`).toBe('nowrap');
      expect(reelLayout.overflowX).toBe('auto');
      expect(reelLayout.scrollbarWidth, `${vp.name} collection reel shows a scrollbar`).toBe('none');
      expect(new Set(reelLayout.tops).size, `${vp.name} categories are not one line`).toBe(1);

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

      const photoButton = page.getByRole('button', { name: /open photo/i }).first();
      await expect(photoButton).toBeVisible();
      const box = await photoButton.boundingBox();
      expect(box, `${vp.name} first frame should be on screen`).not.toBeNull();
      expect(box!.x, `${vp.name} first still flush left`).toBeGreaterThanOrEqual(12);
      const brand = await page.getByRole('button', { name: 'adubsqz' }).boundingBox();
      expect(brand, `${vp.name} wordmark missing`).not.toBeNull();
      expect(brand!.x + brand!.width, `${vp.name} wordmark overflows`).toBeLessThanOrEqual(vp.width + 8);

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
      const lookbookPad = await page
        .locator('.gallery-lookbook')
        .evaluate((el) => parseFloat(getComputedStyle(el).paddingTop));
      const loadLine = `${vp.name} firstStill=${elapsed}ms unique=${stillUrls.size} overflow=${overflow} firstY=${Math.round(box!.y)} viewport=${vp.height}`;
      console.log(loadLine);
      test.info().annotations.push({
        type: 'load',
        description: loadLine,
      });
      // Chrome must leave the first frame on screen; lookbook inset is spacing, not extra chrome.
      expect(box!.y, `${vp.name} chrome pushed the first frame down`).toBeLessThan(
        vp.height * 0.72 + lookbookPad,
      );
      expect(box!.y + 48, `${vp.name} first frame off screen`).toBeLessThan(vp.height);

      if (vp.name === 'mobile') {
        await reel.hover();
        const before = await reel.evaluate((el) => el.scrollLeft);
        await page.mouse.wheel(0, 240);
        const afterVertical = await reel.evaluate((el) => el.scrollLeft);
        expect(afterVertical, `${vp.name} vertical wheel hijacked page scroll`).toBe(before);
        const canScroll = await reel.evaluate((el) => el.scrollWidth > el.clientWidth + 1);
        if (canScroll) {
          await reel.evaluate((el) => {
            el.dispatchEvent(new WheelEvent('wheel', { deltaX: 240, deltaY: 0, bubbles: true, cancelable: true }));
          });
          const afterHorizontal = await reel.evaluate((el) => el.scrollLeft);
          expect(afterHorizontal, `${vp.name} horizontal wheel did not pan categories`).toBeGreaterThan(before);
        }
        await page.evaluate(() => window.scrollTo(0, 0));
      }
    });
  });
}
