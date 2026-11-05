import { describe, expect, it } from 'vitest';
import {
  DESKTOP_HORSESHOE_SEATS,
  MOBILE_ARC_SMASH_ROWS,
  mobileOrderFromSeats,
} from './makers-space-layout';

describe('makers-space layout maps', () => {
  it('names desktop horseshoe seats 1 through 7', () => {
    expect(DESKTOP_HORSESHOE_SEATS).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('smashes the arc on mobile as 3|5 / 2|4|6 / 1|7', () => {
    expect(MOBILE_ARC_SMASH_ROWS).toEqual([
      [3, 5],
      [2, 4, 6],
      [1, 7],
    ]);
  });

  it('orders day assets for mobile by arc smash without changing seat meanings', () => {
    const day = ['a', 'b', 'c', 'd', 'e', 'f', 'g'] as const;
    expect(mobileOrderFromSeats(day)).toEqual(['c', 'e', 'b', 'd', 'f', 'a', 'g']);
  });

  it('rejects a day that is not seven seats', () => {
    expect(() => mobileOrderFromSeats(['only', 'six', 'frames', 'here', 'nope', 'x'])).toThrow(
      /expected 7 seats/i,
    );
  });
});
