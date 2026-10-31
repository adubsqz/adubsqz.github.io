import { describe, it, expect } from 'vitest';
import {
  CONTACT_SHEET_EAGER_FRAMES,
  GALLERY_LIGHTBOX_PAD_CLASS,
  collageEagerFrameCount,
  contactSheetEagerFrameCount,
  imageClassForStill,
  intrinsicSizeForStill,
} from './gallery-layout';

describe('gallery layout', () => {
  it('pads the lightbox for chrome around the still', () => {
    expect(GALLERY_LIGHTBOX_PAD_CLASS).toBe('px-4 sm:px-16');
    expect(CONTACT_SHEET_EAGER_FRAMES).toBe(8);
  });

  it('eager-loads the gate-sized first collage viewport', () => {
    expect(collageEagerFrameCount(390)).toBe(4);
    expect(collageEagerFrameCount(1280)).toBe(8);
    expect(collageEagerFrameCount(0)).toBe(8);
    expect(contactSheetEagerFrameCount(390)).toBe(4);
  });

  it('reserves landscape and portrait boxes', () => {
    expect(intrinsicSizeForStill('horizontal')).toEqual({ width: 1024, height: 680 });
    expect(intrinsicSizeForStill('vertical')).toEqual({ width: 680, height: 1024 });
    expect(intrinsicSizeForStill('square')).toEqual({ width: 800, height: 800 });
    expect(intrinsicSizeForStill(undefined)).toEqual({ width: 1024, height: 680 });
  });

  it('keeps lightbox stills contained instead of cropped', () => {
    expect(imageClassForStill('horizontal')).toContain('object-contain');
    expect(imageClassForStill('vertical')).toContain('object-contain');
    expect(imageClassForStill('square')).toContain('object-contain');
    expect(imageClassForStill(undefined)).toContain('object-contain');
    expect(imageClassForStill('horizontal')).not.toContain('object-cover');
  });
});
