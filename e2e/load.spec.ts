import { expect, test } from '@playwright/test';

/**
 * Contact-sheet load budgets retired on develop.
 * Horseshoe loads at most seven still-life publishes per day.
 */
test.describe('gallery load (retired contact sheet)', () => {
  test.skip(true, 'Replaced by makers-space horseshoe on develop');

  test('placeholder so the file stays import-safe', () => {
    expect(true).toBe(true);
  });
});
