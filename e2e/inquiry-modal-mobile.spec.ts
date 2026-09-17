import { expect, test } from '@playwright/test';

test.describe('Request Invoice sheet (mobile)', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

  test('fills the phone screen without overflow and keeps actions tappable', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const thumb = page.getByRole('button', { name: /open photo/i }).first();
    await thumb.evaluate((el) => {
      (el as HTMLButtonElement).click();
    });

    const lightbox = page.getByRole('dialog', { name: /image lightbox/i });
    await expect(lightbox).toBeVisible();
    const invoiceCta = lightbox.getByRole('button', { name: /request invoice/i });
    const ctaBox = await invoiceCta.boundingBox();
    expect(ctaBox, 'Request Invoice missing box').not.toBeNull();
    expect(ctaBox!.height, 'Request Invoice tap target under 44px').toBeGreaterThanOrEqual(44);
    await invoiceCta.click();

    const invoice = page.getByRole('dialog', { name: /request invoice/i });
    await expect(invoice).toBeVisible();
    await expect(invoice).toHaveAttribute('data-inquiry-sheet');

    const sheet = await invoice.boundingBox();
    expect(sheet, 'invoice sheet missing box').not.toBeNull();
    expect(sheet!.x, 'sheet not flush left').toBeLessThanOrEqual(1);
    expect(sheet!.y, 'sheet not flush top').toBeLessThanOrEqual(1);
    expect(sheet!.width, 'sheet narrower than the phone').toBeGreaterThanOrEqual(388);
    expect(sheet!.height, 'sheet shorter than the phone').toBeGreaterThanOrEqual(840);

    const overflow = await invoice.evaluate((el) => el.scrollWidth > el.clientWidth + 1);
    expect(overflow, 'invoice sheet has horizontal overflow').toBe(false);

    const close = invoice.getByRole('button', { name: /close/i });
    const closeBox = await close.boundingBox();
    expect(closeBox, 'close missing box').not.toBeNull();
    expect(closeBox!.height).toBeGreaterThanOrEqual(44);
    expect(closeBox!.width).toBeGreaterThanOrEqual(44);
    expect(closeBox!.x + closeBox!.width).toBeLessThanOrEqual(390 + 1);

    const nameBox = await page.getByLabel(/full name/i).boundingBox();
    const emailBox = await page.getByLabel(/email/i).boundingBox();
    expect(nameBox).not.toBeNull();
    expect(emailBox).not.toBeNull();
    expect(emailBox!.y, 'name and email sit side-by-side on a phone').toBeGreaterThan(
      nameBox!.y + nameBox!.height - 2,
    );

    const printSize = page.getByLabel(/print size/i);
    await printSize.scrollIntoViewIfNeeded();
    await expect(printSize).toBeVisible();
    const sizePx = await printSize.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(sizePx, 'print size font under 16px (iOS will zoom)').toBeGreaterThanOrEqual(16);
    await expect(page.getByText(/inquire via email for more sizing options/i)).toBeVisible();

    const cancel = page.getByRole('button', { name: /cancel/i });
    const submit = page.getByRole('button', { name: /submit inquiry/i });
    const cancelBox = await cancel.boundingBox();
    const submitBox = await submit.boundingBox();
    expect(cancelBox).not.toBeNull();
    expect(submitBox).not.toBeNull();
    expect(cancelBox!.height).toBeGreaterThanOrEqual(44);
    expect(submitBox!.height).toBeGreaterThanOrEqual(44);
    expect(submitBox!.y, 'submit should stack under cancel on a phone').toBeGreaterThan(
      cancelBox!.y + cancelBox!.height - 2,
    );
    expect(submitBox!.y + submitBox!.height, 'submit clipped below the fold').toBeLessThanOrEqual(844 + 1);

    const covered = await printSize.evaluate((el) => {
      const field = el.getBoundingClientRect();
      const actions = document.querySelector('[data-inquiry-actions]');
      if (!actions) return true;
      const footer = actions.getBoundingClientRect();
      const midY = field.top + field.height / 2;
      return midY >= footer.top && midY <= footer.bottom;
    });
    expect(covered, 'print size sits under the sticky actions').toBe(false);

    await cancel.click();
    await expect(invoice).toHaveCount(0);
  });
});
