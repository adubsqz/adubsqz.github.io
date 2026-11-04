import { describe, it, expect } from 'vitest';
import { GALLERY_CATEGORY_SEEDS, GALLERY_SHUFFLE_SEED, shufflePublicRows, shuffleSeeded } from './gallery-shuffle';

describe('shuffleSeeded', () => {
  it('pins the current gallery shuffle seed', () => {
    expect(GALLERY_SHUFFLE_SEED).toBe(20260912);
  });

  it('is deterministic for the gallery seed', () => {
    const items = ['a', 'b', 'c', 'd', 'e', 'f'];
    expect(shuffleSeeded(items, GALLERY_SHUFFLE_SEED)).toEqual(
      shuffleSeeded(items, GALLERY_SHUFFLE_SEED),
    );
  });

  it('permutes members without adding or dropping any', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    const shuffled = shuffleSeeded(items, GALLERY_SHUFFLE_SEED);
    expect(shuffled).toHaveLength(items.length);
    expect([...shuffled].sort((a, b) => a - b)).toEqual(items);
    expect(shuffled).not.toEqual(items);
  });

  it('leaves a single item and an empty list unchanged', () => {
    expect(shuffleSeeded([], GALLERY_SHUFFLE_SEED)).toEqual([]);
    expect(shuffleSeeded(['only'], GALLERY_SHUFFLE_SEED)).toEqual(['only']);
  });

  it('uses a distinct seed per gallery category', () => {
    expect(new Set(Object.values(GALLERY_CATEGORY_SEEDS)).size).toBe(4);
  });

  it('shuffles public slots and leaves hidden rows in place', () => {
    const rows = ['pub-a', 'hid-1', 'pub-b', 'hid-2', 'pub-c'];
    const shuffled = shufflePublicRows(rows, (row) => row.startsWith('pub-'), GALLERY_SHUFFLE_SEED);
    expect(shuffled[1]).toBe('hid-1');
    expect(shuffled[3]).toBe('hid-2');
    expect(shuffled.filter((row) => row.startsWith('pub-')).sort()).toEqual(['pub-a', 'pub-b', 'pub-c']);
    expect(shuffled).not.toEqual(rows);
  });
});
