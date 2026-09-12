import type { Page } from '@playwright/test';

/** Hydrate lookbook cards that wait for IntersectionObserver before mounting <img>. */
export async function revealAllStills(page: Page): Promise<void> {
  const stills = page.locator('.gallery-still');
  const n = await stills.count();
  for (let i = 0; i < n; i += 1) {
    await stills.nth(i).scrollIntoViewIfNeeded();
  }
}
