import type { Photo } from './types';

/** CSS width of one `.film-strip` (see `index.css`). */
export const FILM_STRIP_WIDTH_REM = 11.5;

/** Frames stacked in each vertical film strip. */
export const FRAMES_PER_STRIP = 6;

/**
 * Fallback eager count when viewport is unknown (tests).
 * Prefer {@link contactSheetEagerFrameCount} at runtime.
 */
export const CONTACT_SHEET_EAGER_FRAMES = 12;

export const GALLERY_LIGHTBOX_PAD_CLASS = 'px-4 sm:px-16';

/** How many contact frames to eager-load / preload for the current viewport width. */
export function contactSheetEagerFrameCount(viewportWidthPx: number, remPx = 16): number {
  const stripPx = FILM_STRIP_WIDTH_REM * remPx;
  if (!Number.isFinite(viewportWidthPx) || viewportWidthPx <= 0 || stripPx <= 0) {
    return FRAMES_PER_STRIP;
  }
  const strips = Math.max(1, Math.ceil(viewportWidthPx / stripPx));
  return strips * FRAMES_PER_STRIP;
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
