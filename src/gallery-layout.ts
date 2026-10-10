import type { Photo } from './types';

/** First row of the sheet. The rest stay lazy until they scroll into view. */
export const CONTACT_SHEET_EAGER_FRAMES = 6;

export const GALLERY_LIGHTBOX_PAD_CLASS = 'px-4 sm:px-16';

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
