import type { Photo, PhotoCollection } from './types';
import sheetTones from './gallery-sheet-tones.json';

/** Coarse palette bins used to spread color across the contact sheet. */
export type SheetTone =
  | 'red'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'magenta'
  | 'white'
  | 'grey'
  | 'black';

const TONE_BY_PATH = sheetTones as Record<string, SheetTone>;

const FAMILY_FALLBACK: Record<string, SheetTone> = {
  greyscale: 'grey',
  'full-spectrum': 'grey',
  redscale: 'red',
  people: 'grey',
};

/** Relative path under `public/photos/still-life/` from a published `src`. */
export function stillLifePathFromSrc(src: string): string {
  const marker = '/photos/still-life/';
  const idx = src.indexOf(marker);
  const raw = idx >= 0 ? src.slice(idx + marker.length) : src;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function toneForPhoto(photo: Photo, collectionId: string): SheetTone {
  const path = stillLifePathFromSrc(photo.src);
  const mapped = TONE_BY_PATH[path];
  if (mapped) return mapped;
  return FAMILY_FALLBACK[collectionId] ?? 'grey';
}

type SheetCell = {
  photo: Photo;
  family: string;
  tone: SheetTone;
  order: number;
};

/** Round-robin cells by tone so each family queue is already palette-mixed. */
function spreadByTone(cells: SheetCell[]): SheetCell[] {
  const buckets = new Map<SheetTone, SheetCell[]>();
  for (const cell of cells) {
    const list = buckets.get(cell.tone) ?? [];
    list.push(cell);
    buckets.set(cell.tone, list);
  }
  const queues = [...buckets.values()];
  const out: SheetCell[] = [];
  while (queues.some((queue) => queue.length > 0)) {
    for (const queue of queues) {
      const next = queue.shift();
      if (next) out.push(next);
    }
  }
  return out;
}

/**
 * Stable contact-sheet order: same collections → same frames every load
 * (preload-friendly), while spreading bucket + palette so the proof sheet
 * does not clump greys, redscale, or one hue.
 */
export function arrangeContactSheet(collections: readonly PhotoCollection[]): Photo[] {
  const queues: SheetCell[][] = [];
  let order = 0;
  for (const collection of collections) {
    const cells: SheetCell[] = collection.photos.map((photo) => ({
      photo,
      family: collection.id,
      tone: toneForPhoto(photo, collection.id),
      order: order++,
    }));
    queues.push(spreadByTone(cells));
  }

  const out: Photo[] = [];
  let lastFamily = '';
  let lastTone: SheetTone | '' = '';
  const recentTones: SheetTone[] = [];

  while (queues.some((queue) => queue.length > 0)) {
    let bestQueue = -1;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (let q = 0; q < queues.length; q += 1) {
      const head = queues[q]![0];
      if (!head) continue;

      const remainingInFamily = queues[q]!.length;
      let score = remainingInFamily * 20;

      if (head.family !== lastFamily) score += 120;
      else score -= 90;

      if (head.tone !== lastTone) score += 40;
      else score -= 50;

      if (!recentTones.includes(head.tone)) score += 24;
      else score -= 10 * recentTones.filter((tone) => tone === head.tone).length;

      // Deterministic tie-break: earlier manifest encounter, then family index.
      score -= head.order * 0.0001;
      score -= q * 0.001;

      if (score > bestScore) {
        bestScore = score;
        bestQueue = q;
      }
    }

    if (bestQueue < 0) break;
    const picked = queues[bestQueue]!.shift();
    if (!picked) break;

    out.push(picked.photo);
    lastFamily = picked.family;
    lastTone = picked.tone;
    recentTones.unshift(picked.tone);
    if (recentTones.length > 3) recentTones.length = 3;
  }

  return out;
}
