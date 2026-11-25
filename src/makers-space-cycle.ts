import {
  CYCLE_CLOSER_PATH,
  DAY1_SEATS,
  SEATS_PER_DAY,
} from './makers-space-day1';

/** Every opening-seat path (sheet + Shooks Run) must not recur mid-cycle. */
const DAY1_SEAT_SET = new Set<string>(DAY1_SEATS);

/**
 * Fixed rotation list: opening seven, then contact-sheet order minus day-1
 * seats, then brass_trojan. No mid-cycle repeats.
 *
 * Trims the mid section so total length stays divisible by {@link SEATS_PER_DAY}
 * as the Portfolio sheet grows — leftover mid frames stay on Portfolio only.
 */
export function buildMakersSpaceCycle(sheetPathsInOrder: readonly string[]): string[] {
  const rest = sheetPathsInOrder.filter(
    (path) => !DAY1_SEAT_SET.has(path) && path !== CYCLE_CLOSER_PATH,
  );
  const fixed = DAY1_SEATS.length + 1; // day-1 block + closer
  const rem = (fixed + rest.length) % SEATS_PER_DAY;
  const mid = rem === 0 ? rest : rest.slice(0, rest.length - rem);
  return [...DAY1_SEATS, ...mid, CYCLE_CLOSER_PATH];
}

/** Whole horseshoe days for a built cycle (floor of length / seats). */
export function cycleDays(cycle: readonly string[]): number {
  return Math.floor(cycle.length / SEATS_PER_DAY);
}

/** 1-based day index; wraps. Day 0 treated as last day of the cycle. */
export function windowForDay(cycle: readonly string[], day: number): string[] {
  const days = Math.floor(cycle.length / SEATS_PER_DAY);
  if (days < 1) return [];
  let index = day;
  if (index === 0) index = days;
  const normalized = ((index - 1) % days + days) % days;
  const start = normalized * SEATS_PER_DAY;
  return cycle.slice(start, start + SEATS_PER_DAY);
}
