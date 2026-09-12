/**
 * Deterministic Fisher–Yates. Same seed + items → same order on every run.
 * Manifest category arrays are the reel source of truth; this seed produced
 * the current `src/gallery-manifest.json` permutation (not Math.random on load).
 */
export const GALLERY_SHUFFLE_SEED = 20260912;

/** Per-category seeds so each reel gets its own permutation of the same algorithm. */
export const GALLERY_CATEGORY_SEEDS = {
  bw: GALLERY_SHUFFLE_SEED,
  color: GALLERY_SHUFFLE_SEED + 1,
  redscale: GALLERY_SHUFFLE_SEED + 2,
  people: GALLERY_SHUFFLE_SEED + 3,
} as const;

export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleSeeded<T>(items: readonly T[], seed: number = GALLERY_SHUFFLE_SEED): T[] {
  const next = mulberry32(seed);
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    const current = out[i];
    const swap = out[j];
    if (current === undefined || swap === undefined) continue;
    out[i] = swap;
    out[j] = current;
  }
  return out;
}

/** Permute public slots only so hidden numeric rows stay put and reel order still changes. */
export function shufflePublicRows<T>(
  rows: readonly T[],
  isPublic: (row: T) => boolean,
  seed: number = GALLERY_SHUFFLE_SEED,
): T[] {
  const publicIdx: number[] = [];
  const publicRows: T[] = [];
  rows.forEach((row, i) => {
    if (!isPublic(row)) return;
    publicIdx.push(i);
    publicRows.push(row);
  });
  const shuffled = shuffleSeeded(publicRows, seed);
  const out = rows.slice();
  publicIdx.forEach((idx, j) => {
    const next = shuffled[j];
    if (next !== undefined) out[idx] = next;
  });
  return out;
}
