import type { Photo } from './types';

/** Even inset around every still and between stills. */
export const GALLERY_STILL_INSET_CLASS = 'p-10 sm:p-16';
export const GALLERY_STILL_GAP_CLASS = 'gap-16 sm:gap-24';

export const GALLERY_LOOKBOOK_CLASS = `gallery-lookbook mx-auto w-full max-w-5xl bg-white ${GALLERY_STILL_INSET_CLASS}`;
export const GALLERY_STILL_STACK_CLASS = `gallery-still-stack flex flex-col ${GALLERY_STILL_GAP_CLASS}`;
export const GALLERY_STILL_ITEM_CLASS = 'gallery-still w-full';
export const GALLERY_STILL_OFFSCREEN_CLASS =
  '[content-visibility:auto] [contain-intrinsic-size:1024px_680px]';
/** Eager + lazy src only for the first screenful; the rest hydrate on intersect. */
export const GALLERY_FIRST_PAINT_STILLS = 3;

export const GALLERY_LIGHTBOX_PAD_CLASS = 'p-6 sm:p-10';

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
      return 'gallery-image block h-auto max-h-[min(78dvh,920px)] w-full max-w-full object-contain';
    case 'square':
      return 'gallery-image block h-auto max-h-[min(70dvh,880px)] w-full max-w-full object-contain';
    case 'horizontal':
      return 'gallery-image block h-auto max-h-[min(72dvh,900px)] w-full max-w-full object-contain';
    case undefined:
      return 'gallery-image block h-auto max-h-[min(72dvh,900px)] w-full max-w-full object-contain';
    default: {
      const _exhaustive: never = orientation;
      return _exhaustive;
    }
  }
}
