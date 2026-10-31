import type { Photo } from './types';

/** Fallback eager count when viewport is unknown (tests). Prefer {@link collageEagerFrameCount}. */
export const CONTACT_SHEET_EAGER_FRAMES = 8;

/** @deprecated Alias kept for older imports — same as {@link CONTACT_SHEET_EAGER_FRAMES}. */
export const FRAMES_PER_STRIP = 4;

export const GALLERY_LIGHTBOX_PAD_CLASS = 'px-4 sm:px-16';

/**
 * How many collage cells to eager-load / preload for the current viewport.
 * Matches the password-gate first viewport: 2×2 on phone, 2×4 on desktop.
 */
export function collageEagerFrameCount(viewportWidthPx: number): number {
  if (!Number.isFinite(viewportWidthPx) || viewportWidthPx <= 0) {
    return CONTACT_SHEET_EAGER_FRAMES;
  }
  return viewportWidthPx < 640 ? 4 : 8;
}

/** @deprecated Use {@link collageEagerFrameCount}. */
export function contactSheetEagerFrameCount(viewportWidthPx: number, _remPx = 16): number {
  return collageEagerFrameCount(viewportWidthPx);
}

export function intrinsicSizeForStill(orientation: Photo['orientation']): {
  width: number;
  height: number;
} {
  switch (orientation) {
    case 'vertical':
      return { width: 680, height: 1024 };
    case 'square':
      return { width: 800, height: 800 };
    case 'horizontal':
      return { width: 1024, height: 680 };
    case undefined:
      return { width: 1024, height: 680 };
    default: {
      const _exhaustive: never = orientation;
      return _exhaustive;
    }
  }
}

export function imageClassForStill(orientation: Photo['orientation']): string {
  switch (orientation) {
    case 'vertical':
      return 'gallery-image block h-auto max-h-[min(72dvh,860px)] w-auto max-w-full object-contain';
    case 'square':
      return 'gallery-image block h-auto max-h-[min(72dvh,860px)] w-auto max-w-full object-contain';
    case 'horizontal':
      return 'gallery-image block h-auto max-h-[min(72dvh,860px)] w-auto max-w-full object-contain';
    case undefined:
      return 'gallery-image block h-auto max-h-[min(72dvh,860px)] w-auto max-w-full object-contain';
    default: {
      const _exhaustive: never = orientation;
      return _exhaustive;
    }
  }
}
