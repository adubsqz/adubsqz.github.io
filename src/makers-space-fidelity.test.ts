import { describe, expect, it } from 'vitest';
import {
  anyPairOverlaps,
  aspectKind,
  displayedMatchesNatural,
  rectsOverlap,
} from './makers-space-fidelity';

describe('makers-space fidelity', () => {
  it('detects overlapping seat boxes and allows edge-touching neighbors', () => {
    expect(
      rectsOverlap(
        { left: 0, top: 0, right: 100, bottom: 100 },
        { left: 50, top: 50, right: 150, bottom: 150 },
      ),
    ).toBe(true);
    expect(
      rectsOverlap(
        { left: 0, top: 0, right: 100, bottom: 100 },
        { left: 100, top: 0, right: 200, bottom: 100 },
      ),
    ).toBe(false);
    expect(
      anyPairOverlaps([
        { left: 0, top: 0, right: 40, bottom: 40 },
        { left: 50, top: 0, right: 90, bottom: 40 },
        { left: 20, top: 10, right: 60, bottom: 50 },
      ]),
    ).toBe(true);
  });

  it('classifies landscape, portrait, and near-square', () => {
    expect(aspectKind(2400, 1591)).toBe('landscape');
    expect(aspectKind(750, 1000)).toBe('portrait');
    expect(aspectKind(1000, 1000)).toBe('square');
  });

  it('requires displayed aspect to match natural (no crop / stretch)', () => {
    expect(displayedMatchesNatural(2400, 1600, 480, 320)).toBe(true);
    expect(displayedMatchesNatural(750, 1000, 180, 240)).toBe(true);
    // Forced 3:4 crop of a landscape frame — must fail
    expect(displayedMatchesNatural(2400, 1600, 180, 240)).toBe(false);
  });
});
