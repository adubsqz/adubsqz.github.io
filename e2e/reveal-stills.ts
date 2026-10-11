import type { Page } from '@playwright/test';

/** Scroll every contact-sheet frame so scrollport-gated stills mount. */
export async function revealAllStills(page: Page): Promise<void> {
  const stills = page.locator('.contact-frame');
  const n = await stills.count();
  for (let i = 0; i < n; i += 1) {
    const frame = stills.nth(i);
    await frame.evaluate((el) => {
      const node = el as HTMLElement;
      const roll = node.closest('.film-roll') as HTMLElement | null;
      if (roll) {
        const rollRect = roll.getBoundingClientRect();
        const frameRect = node.getBoundingClientRect();
        roll.scrollLeft += frameRect.left - rollRect.left - 24;
      }
      node.scrollIntoView({ block: 'nearest', inline: 'center' });
    });
    await frame.locator('img.gallery-image').waitFor({ state: 'attached', timeout: 5000 });
  }
}

/** Open the first frame on the sheet. */
export async function clickOpenPhoto(page: Page) {
  const frame = page.getByRole('button', { name: /open photo/i }).first();
  await frame.evaluate((el) => {
    (el as HTMLButtonElement).click();
  });
}
