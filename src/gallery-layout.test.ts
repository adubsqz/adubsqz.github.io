import { describe, it, expect } from 'vitest';
import {
  CONTACT_SHEET_EAGER_FRAMES,
  FRAMES_PER_STRIP,
  GALLERY_LIGHTBOX_PAD_CLASS,
  contactSheetEagerFrameCount,
  imageClassForStill,
  intrinsicSizeForStill,
} from './gallery-layout';

describe('gallery layout', () => {
  it('pads the lightbox so the invoice sits in the white margin', () => {
    expect(GALLERY_LIGHTBOX_PAD_CLASS).toBe('px-4 sm:px-16');
    expect(CONTACT_SHEET_EAGER_FRAMES).toBeGreaterThan(0);
    expect(CONTACT_SHEET_EAGER_FRAMES).toBeLessThan(24);
  });

  it('eager-loads only the strips that fit the viewport width', () => {
    expect(contactSheetEagerFrameCount(390)).toBe(FRAMES_PER_STRIP * 3);
    expect(contactSheetEagerFrameCount(1280)).toBe(FRAMES_PER_STRIP * 7);
    expect(contactSheetEagerFrameCount(0)).toBe(FRAMES_PER_STRIP);
  });

  it('reserves landscape and portrait boxes', () => {
    expect(intrinsicSizeForStill('horizontal')).toEqual({ width: 1024, height: 680 });
    expect(intrinsicSizeForStill('vertical')).toEqual({ width: 680, height: 1024 });
    expect(intrinsicSizeForStill('square')).toEqual({ width: 800, height: 800 });
    expect(intrinsicSizeForStill(undefined)).toEqual({ width: 1024, height: 680 });
  });

  it('keeps stills contained instead of cropped', () => {
    expect(imageClassForStill('horizontal')).toContain('object-contain');
    expect(imageClassForStill('vertical')).toContain('object-contain');
    expect(imageClassForStill('square')).toContain('object-contain');
    expect(imageClassForStill(undefined)).toContain('object-contain');
    expect(imageClassForStill('horizontal')).not.toContain('object-cover');
  });
});
