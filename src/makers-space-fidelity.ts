/** Layout / publish fidelity helpers for the maker's space. */

export type RectLike = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type AspectKind = 'landscape' | 'portrait' | 'square';

/** True when two axis-aligned boxes share interior area (touching edges OK). */
export function rectsOverlap(a: RectLike, b: RectLike, epsilon = 0.5): boolean {
  return !(
    a.right <= b.left + epsilon ||
    b.right <= a.left + epsilon ||
    a.bottom <= b.top + epsilon ||
    b.bottom <= a.top + epsilon
  );
}

export function anyPairOverlaps(rects: readonly RectLike[], epsilon = 0.5): boolean {
  for (let i = 0; i < rects.length; i += 1) {
    for (let j = i + 1; j < rects.length; j += 1) {
      if (rectsOverlap(rects[i]!, rects[j]!, epsilon)) return true;
    }
  }
  return false;
}

export function aspectKind(width: number, height: number): AspectKind {
  if (!(width > 0 && height > 0)) {
    throw new Error(`invalid dimensions ${width}×${height}`);
  }
  const ratio = width / height;
  if (Math.abs(ratio - 1) < 0.03) return 'square';
  return ratio > 1 ? 'landscape' : 'portrait';
}

/**
 * Displayed box must keep the natural aspect (contain, no crop / stretch / rotate).
 * Tolerance is relative error on width/height ratio.
 */
export function displayedMatchesNatural(
  naturalWidth: number,
  naturalHeight: number,
  displayWidth: number,
  displayHeight: number,
  tolerance = 0.04,
): boolean {
  if (
    !(
      naturalWidth > 0 &&
      naturalHeight > 0 &&
      displayWidth > 0 &&
      displayHeight > 0
    )
  ) {
    return false;
  }
  const natural = naturalWidth / naturalHeight;
  const displayed = displayWidth / displayHeight;
  return Math.abs(natural - displayed) / natural <= tolerance;
}
