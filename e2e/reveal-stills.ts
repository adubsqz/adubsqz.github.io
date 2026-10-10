import type { Page } from '@playwright/test';

/** Hydrate contact-sheet thumbs that wait for the strip to scroll them in. */
export async function revealAllStills(page: Page): Promise<void> {
  const stills = page.locator('.contact-thumb');
  const n = await stills.count();
  for (let i = 0; i < n; i += 1) {
    await stills.nth(i).scrollIntoViewIfNeeded();
  }
}

/** Open the large frame. */
export async function clickOpenPhoto(page: Page) {
  const frame = page.getByRole('button', { name: /open photo/i });
  await frame.evaluate((el) => {
    (el as HTMLButtonElement).click();
  });
}
