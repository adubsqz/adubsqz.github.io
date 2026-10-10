import type { Page } from '@playwright/test';

/** Scroll every contact-sheet frame so lazy images mount. */
export async function revealAllStills(page: Page): Promise<void> {
  const stills = page.locator('.contact-frame');
  const n = await stills.count();
  for (let i = 0; i < n; i += 1) {
    await stills.nth(i).scrollIntoViewIfNeeded();
  }
}

/** Open the first frame on the sheet. */
export async function clickOpenPhoto(page: Page) {
  const frame = page.getByRole('button', { name: /open photo/i }).first();
  await frame.evaluate((el) => {
    (el as HTMLButtonElement).click();
  });
}
