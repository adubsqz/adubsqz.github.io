import { test, expect } from '@playwright/test';

test.describe('site', () => {
  test('gallery filters, lightbox, and about/contact', async ({ page }) => {
    await page.coverage.startJSCoverage({ resetOnNavigation: false });
    await page.goto('/');

    await expect(page.getByRole('tab', { name: /^gallery$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /greyscale/i })).toBeVisible();
    await page.getByRole('button', { name: /full spectrum/i }).click();
    await page.getByRole('button', { name: /redscale/i }).click();
    await page.getByRole('button', { name: /^people$/i }).click();
    await expect(page.getByRole('button', { name: /open photo/i }).first()).toBeVisible();
    await page.getByRole('button', { name: /greyscale/i }).click();

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

    await page.getByRole('tab', { name: /about me/i }).click();
    await expect(page.getByText(/I am not an AI robot/i)).toBeVisible();
    await expect(page.getByText(/lightweight portfolio sites for photographers/i)).toBeVisible();
    await expect(page.getByText(/Need prints, a license, or a site/i)).toBeVisible();
    await expect(page.getByText(/rights reserved/i)).toBeVisible();
    await expect(page.getByAltText(/portrait/i)).toHaveCount(0);

    await page.getByRole('button', { name: /let's talk/i }).click();
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
