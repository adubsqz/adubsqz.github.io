/** Desktop horseshoe seat numbers (1 = Past … 7 = Outcome). */
export const DESKTOP_HORSESHOE_SEATS = [1, 2, 3, 4, 5, 6, 7] as const;

/** Mobile arc smash: top 3|5, middle 2|4|6, bottom 1|7. */
export const MOBILE_ARC_SMASH_ROWS = [
  [3, 5],
  [2, 4, 6],
  [1, 7],
] as const;

/** Flatten arc smash rows into display order for a 7-seat day (1-based seats). */
export function mobileOrderFromSeats<T>(seats: readonly T[]): T[] {
  if (seats.length !== 7) {
    throw new Error(`expected 7 seats, got ${seats.length}`);
  }
  return MOBILE_ARC_SMASH_ROWS.flat().map((seat) => seats[seat - 1]!);
}
