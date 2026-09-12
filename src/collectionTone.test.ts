import { describe, expect, it } from 'vitest';
import { collectionTone } from './collectionTone';

describe('collectionTone', () => {
  it('maps known collection ids and falls back to orange', () => {
    expect(collectionTone('greyscale')).toBe('yellow');
    expect(collectionTone('full-spectrum')).toBe('blue');
    expect(collectionTone('redscale')).toBe('orange');
    expect(collectionTone('people')).toBe('purple');
    expect(collectionTone('nope')).toBe('orange');
  });
});
