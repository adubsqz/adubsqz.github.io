import { test, expect } from '@playwright/test';

/**
 * Horseshoe UI is not wired yet. These stay skipped until MakersSpaceView lands
 * on develop. Un-skip in the UI task; do not delete — they define the smoke bar.
 */
test.describe('makers space horseshoe', () => {
  test.skip(true, 'UI not wired on develop yet — pure cycle/layout covered in Vitest');

  test('shows seven seats on grain paper without tarot role labels', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('makers-space')).toBeVisible();
    await expect(page.getByTestId('makers-space')).toHaveAttribute('data-ground', 'grain-paper');
    await expect(page.getByTestId('makers-seat')).toHaveCount(7);
    await expect(page.getByText(/hidden obstacles|people's attitudes|the advice/i)).toHaveCount(0);
  });

  test('mobile smash uses three rows', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.getByTestId('makers-space-mobile')).toBeVisible();
    await expect(page.getByTestId('makers-mobile-row')).toHaveCount(3);
  });
});
