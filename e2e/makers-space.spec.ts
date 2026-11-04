import { test, expect } from '@playwright/test';

test.describe('makers space horseshoe', () => {
  test('shows seven seats on grain paper without tarot role labels', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('makers-space')).toBeVisible();
    await expect(page.getByTestId('makers-space')).toHaveAttribute('data-ground', 'grain-paper');
    await expect(page.getByTestId('makers-seat')).toHaveCount(7);
    await expect(page.getByText(/hidden obstacles|people's attitudes|the advice/i)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /open photo/i })).toHaveCount(7);

    // CSS diagonal overlay; JPEG © burn-in is in the published file itself
    const imgs = page.locator('.makers-space__img');
    await expect(imgs).toHaveCount(7);
    await imgs.first().evaluate((img: HTMLImageElement) => {
      if (img.complete) img.dispatchEvent(new Event('load'));
    });
    await expect(page.getByText(/^adubsqz$/i).first()).toBeVisible();
  });

  test('mobile smash keeps seven seats in three arc rows', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.getByTestId('makers-space-mobile')).toBeVisible();
    await expect(page.getByTestId('makers-seat')).toHaveCount(7);
    await expect(page.locator('[data-testid=makers-seat][data-row="1"]')).toHaveCount(2);
    await expect(page.locator('[data-testid=makers-seat][data-row="2"]')).toHaveCount(3);
    await expect(page.locator('[data-testid=makers-seat][data-row="3"]')).toHaveCount(2);
  });
});
