import { describe, it, expect } from 'vitest';
import {
  GALLERY_FIRST_PAINT_STILLS,
  GALLERY_LIGHTBOX_PAD_CLASS,
  GALLERY_LOOKBOOK_CLASS,
  GALLERY_STILL_GAP_CLASS,
  GALLERY_STILL_INSET_CLASS,
  GALLERY_STILL_ITEM_CLASS,
  GALLERY_STILL_OFFSCREEN_CLASS,
  GALLERY_STILL_STACK_CLASS,
  imageClassForStill,
  intrinsicSizeForStill,
} from './gallery-layout';

describe('gallery lookbook layout', () => {
  it('uses the same inset on every side of the lookbook and between stills', () => {
    expect(GALLERY_STILL_INSET_CLASS).toBe('p-6 sm:p-10');
    expect(GALLERY_STILL_GAP_CLASS).toBe('gap-6 sm:gap-10');
    expect(GALLERY_LOOKBOOK_CLASS).toContain(GALLERY_STILL_INSET_CLASS);
    expect(GALLERY_STILL_STACK_CLASS).toContain(GALLERY_STILL_GAP_CLASS);
    expect(GALLERY_STILL_ITEM_CLASS).toContain('gallery-still');
    expect(GALLERY_STILL_OFFSCREEN_CLASS).toContain('content-visibility:auto');
    expect(GALLERY_FIRST_PAINT_STILLS).toBe(3);
    expect(GALLERY_LIGHTBOX_PAD_CLASS).toBe(GALLERY_STILL_INSET_CLASS);
  });

  it('reserves landscape and portrait boxes so lazy stills stay below the fold', () => {
    expect(intrinsicSizeForStill('horizontal')).toEqual({ width: 1024, height: 680 });
    expect(intrinsicSizeForStill('vertical')).toEqual({ width: 680, height: 1024 });
    expect(intrinsicSizeForStill('square')).toEqual({ width: 800, height: 800 });
    expect(intrinsicSizeForStill(undefined)).toEqual({ width: 1024, height: 680 });
  });

  it('keeps stills contained instead of cropped, including vertical frames', () => {
    expect(imageClassForStill('horizontal')).toContain('object-contain');
    expect(imageClassForStill('vertical')).toContain('object-contain');
    expect(imageClassForStill('square')).toContain('object-contain');
    expect(imageClassForStill(undefined)).toContain('object-contain');
  });
});
