import { test, expect } from '@playwright/test';
import { SITE_HOST } from '../src/site';

test.describe('site', () => {
  test('gallery filters, lightbox, and about/contact', async ({ page }) => {
    await page.coverage.startJSCoverage({ resetOnNavigation: false });
    await page.goto('/');

    await expect(page.getByRole('button', { name: /^gallery$/i })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'adubsqz' })).toBeVisible();
    const tagline = page.getByRole('img', {
      name: /printable film photography as small as a locket for ur momma/i,
    });
    await expect(tagline).toBeVisible();
    await expect(tagline).toHaveAttribute('src', '/tagline.jpg');
    await expect(page.getByRole('navigation', { name: /collections/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /greyscale/i })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: /full spectrum/i }).locator('.graffiti-label--on')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /redscale/i }).locator('.graffiti-label--on')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^portraits$/i }).locator('.graffiti-label--on')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'adubsqz' }).locator('.graffiti-label__core')).toHaveCSS(
      'color',
      'rgb(243, 182, 200)',
    );
    await expect(page.getByRole('button', { name: /about me/i })).toHaveCount(0);
    await page.getByRole('button', { name: /full spectrum/i }).click();
    await expect(page.getByRole('button', { name: /full spectrum/i })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: /full spectrum/i }).locator('.graffiti-label--on')).toHaveCount(1);
    await page.getByRole('button', { name: /redscale/i }).click();
    await page.getByRole('button', { name: /^portraits$/i }).click();
    await expect(page.locator('.gallery-still')).toHaveCount(13);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.getByRole('button', { name: /open photo/i })).toHaveCount(13, { timeout: 10_000 });
    await expect(page.getByRole('button', { name: /next page/i })).toHaveCount(0);

    const thumb = page.getByRole('button', { name: /open photo/i }).first();
    await thumb.click();
    const lightbox = page.getByRole('dialog', { name: /image lightbox/i });
    await expect(lightbox).toBeVisible();
    await page.getByRole('button', { name: /view next photo/i }).click();
    await page.getByRole('button', { name: /view previous photo/i }).click();
    await page.keyboard.press('Escape');
    await expect(lightbox).toBeHidden();

    await thumb.click();
    await expect(lightbox).toBeVisible();
    await expect(lightbox.getByRole('button', { name: /contact me/i })).toBeVisible();
    await expect(lightbox.getByRole('button', { name: /request invoice/i })).toHaveCount(0);
    await expect(lightbox.getByText(/tearsheet/i)).toHaveCount(0);
    await expect(lightbox.getByText(/request invoice/i)).toHaveCount(0);
    await lightbox.getByRole('button', { name: /contact me/i }).click();
    const contactFromPhoto = page.getByRole('dialog', { name: /contact/i });
    await expect(contactFromPhoto).toBeVisible();
    await expect(page.getByRole('dialog', { name: /request invoice/i })).toHaveCount(0);
    await expect(page.getByLabel(/shipping address/i)).toHaveCount(0);
    await expect(page.getByLabel(/subject/i)).not.toHaveValue('');
    await expect(page.getByLabel(/message/i)).not.toHaveValue('');
    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(contactFromPhoto).toHaveCount(0);

    await page.getByRole('button', { name: 'adubsqz' }).click();
    await expect(page.getByRole('button', { name: 'adubsqz' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: /^gallery$/i })).toHaveCount(0);
    await expect(page.getByText(/I am not an AI robot/i)).toBeVisible();
    await expect(page.getByText(/lightweight portfolio sites for photographers/i)).toBeVisible();
    await expect(page.getByText(/Need prints, a license, or a site/i)).toBeVisible();
    await expect(page.getByText(/rights reserved/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /^instagram$/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /^instagram$/i })).toHaveAttribute(
      'href',
      'https://www.instagram.com/adubsqz/',
    );
    await expect(page.getByRole('link', { name: SITE_HOST }).first()).toBeVisible();
    await expect(page.getByAltText(/portrait/i)).toHaveCount(0);

    const talk = page.getByRole('button', { name: /let's talk/i });
    await expect(talk.locator('.graffiti-label--on')).toHaveAttribute('data-tone', 'pink');
    await expect(talk.locator('.graffiti-label__core')).toHaveCSS('color', 'rgb(243, 182, 200)');
    await talk.click();
    await expect(page.getByRole('dialog', { name: /contact/i })).toBeVisible();
    await page.getByLabel(/name/i).fill('Ada');
    await page.getByLabel(/email/i).fill('ada@example.com');
    await page.getByLabel(/subject/i).fill('Prints');
    await page.getByLabel(/message/i).fill('Hello');
    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByRole('dialog', { name: /contact/i })).toHaveCount(0);

    await page.route('https://formsubmit.co/**', async (route) => {
      expect(route.request().url()).toContain('9e5f95e3027a5d9d5fd6e84de3e2ebf4');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });
    await page.route('https://api.web3forms.com/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });
    await page.getByRole('button', { name: /let's talk/i }).click();
    await page.getByLabel(/name/i).fill('Ada');
    await page.getByLabel(/email/i).fill('ada@example.com');
    await page.getByLabel(/subject/i).fill('Prints');
    await page.getByLabel(/message/i).fill('Hello');
    await page.getByRole('button', { name: /send/i }).click();
    await expect(page.getByText(/message sent/i)).toBeVisible();

    const coverage = await page.coverage.stopJSCoverage();
    const src = coverage.filter(
      (entry) => entry.url.includes('/src/') && !entry.url.includes('.test.') && !entry.url.includes('/test/'),
    );
    let used = 0;
    let total = 0;
    for (const entry of src) {
      const source = entry.source ?? '';
      if (!source) continue;
      const hit = new Array(source.length).fill(0);
      for (const fn of entry.functions) {
        for (const range of fn.ranges) {
          if (range.count > 0) {
            for (let i = range.startOffset; i < range.endOffset && i < hit.length; i += 1) hit[i] = 1;
          }
        }
      }
      total += source.length;
      used += hit.reduce((a, b) => a + b, 0);
    }
    const pct = total === 0 ? 0 : (used / total) * 100;
    expect(pct, `e2e JS coverage of loaded /src/ modules was ${pct.toFixed(1)}%`).toBeGreaterThanOrEqual(90);
  });
});
