import type { Page } from '@playwright/test';

/** Scroll the collage so off-viewport cells mount their sheet thumbs. */
export async function revealAllStills(page: Page): Promise<void> {
  const stills = page.locator('.lookbook-cell');
  const n = await stills.count();
  for (let i = 0; i < n; i += 1) {
    const cell = stills.nth(i);
    await cell.evaluate((el) => {
      (el as HTMLElement).scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
    await cell.locator('img.gallery-image').waitFor({ state: 'attached', timeout: 5000 }).catch(() => undefined);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
}

/** Open the first frame in the collage. */
export async function clickOpenPhoto(page: Page) {
  const frame = page.getByRole('button', { name: /open photo/i }).first();
  await frame.evaluate((el) => {
    (el as HTMLButtonElement).click();
  });
}
