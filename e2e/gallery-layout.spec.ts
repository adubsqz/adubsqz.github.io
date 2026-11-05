import { expect, test } from '@playwright/test';

/**
 * Contact-sheet collage e2e retired on develop.
 * Work is now the Seven Card Horseshoe — see e2e/makers-space.spec.ts.
 */
test.describe('lookbook collage (retired)', () => {
  test.skip(true, 'Replaced by makers-space horseshoe on develop');

  test('placeholder so the file stays import-safe', () => {
    expect(true).toBe(true);
  });
});
