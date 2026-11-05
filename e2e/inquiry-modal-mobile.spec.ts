import { expect, test } from '@playwright/test';

/**
 * Print-quote lightbox from GalleryView is not wired on the horseshoe yet.
 * Re-enable when MakersSpaceView lightbox gains Request a print quote.
 */
test.describe('Print quote sheet (mobile)', () => {
  test.skip(true, 'Horseshoe lightbox has no invoice sheet yet on develop');

  test('placeholder so the file stays import-safe', () => {
    expect(true).toBe(true);
  });
});
