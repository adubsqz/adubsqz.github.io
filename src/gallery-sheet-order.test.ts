import { describe, it, expect } from 'vitest';
import { COLLECTIONS } from './data';
import sheetPins from './gallery-sheet-pins.json';
import sheetTones from './gallery-sheet-tones.json';
import { arrangeContactSheet, stillLifePathFromSrc, toneForPhoto } from './gallery-sheet-order';

describe('arrangeContactSheet', () => {
  const frames = arrangeContactSheet(COLLECTIONS);
  const flat = COLLECTIONS.flatMap((collection) => collection.photos);
  const pinPaths = (Array.isArray(sheetPins) ? sheetPins : []).filter(
    (p): p is string => typeof p === 'string' && p.length > 0,
  );

  it('keeps every published still exactly once', () => {
    expect(frames).toHaveLength(flat.length);
    expect(new Set(frames.map((photo) => photo.id)).size).toBe(flat.length);
    expect(frames.map((photo) => photo.id).sort()).toEqual(flat.map((photo) => photo.id).sort());
  });

  it('has a sampled tone for every published still-life path', () => {
    for (const photo of flat) {
      const path = stillLifePathFromSrc(photo.src);
      expect(sheetTones[path as keyof typeof sheetTones], path).toBeTruthy();
    }
  });

  it('is stable across calls for preload-friendly layout', () => {
    expect(arrangeContactSheet(COLLECTIONS).map((photo) => photo.id)).toEqual(
      frames.map((photo) => photo.id),
    );
  });

  it('spreads tones so neighbors rarely share the same palette bin', () => {
    if (frames.length < 4) return;
    const familyOf = new Map(
      COLLECTIONS.flatMap((collection) =>
        collection.photos.map((photo) => [photo.id, collection.id] as const),
      ),
    );
    let sameToneNeighbors = 0;
    for (let i = 1; i < frames.length; i += 1) {
      const prev = frames[i - 1]!;
      const cur = frames[i]!;
      const prevTone = toneForPhoto(prev, familyOf.get(prev.id) ?? '');
      const curTone = toneForPhoto(cur, familyOf.get(cur.id) ?? '');
      if (prevTone === curTone) sameToneNeighbors += 1;
    }
    // Clumped bucket order would be far worse; allow a little adjacency for scarce tones.
    expect(sameToneNeighbors).toBeLessThan(frames.length * 0.35);
  });

  it('puts pinned paths first on the sheet', () => {
    const expected = pinPaths.filter((path) =>
      flat.some((photo) => stillLifePathFromSrc(photo.src) === path),
    );
    expect(frames.slice(0, expected.length).map((photo) => stillLifePathFromSrc(photo.src))).toEqual(
      expected,
    );
  });

  it('interleaves buckets through most of the sheet', () => {
    if (frames.length < 8) return;
    const familyOf = new Map(
      COLLECTIONS.flatMap((collection) =>
        collection.photos.map((photo) => [photo.id, collection.id] as const),
      ),
    );
    // Featured pins may intentionally lead; leftover frames from the largest bucket
    // may clump at the tail — judge the aesthetic body between those regions.
    const pinLen = pinPaths.filter((path) =>
      flat.some((photo) => stillLifePathFromSrc(photo.src) === path),
    ).length;
    const bodyEnd = Math.floor(frames.length * 0.85);
    const body = frames.slice(pinLen, Math.max(pinLen + 1, bodyEnd));
    if (body.length < 4) return;
    let longestRun = 1;
    let run = 1;
    for (let i = 1; i < body.length; i += 1) {
      const prevFamily = familyOf.get(body[i - 1]!.id);
      const curFamily = familyOf.get(body[i]!.id);
      if (prevFamily === curFamily) {
        run += 1;
        longestRun = Math.max(longestRun, run);
      } else {
        run = 1;
      }
    }
    expect(longestRun).toBeLessThanOrEqual(2);
  });
});

