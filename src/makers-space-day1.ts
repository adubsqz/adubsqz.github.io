/** Day-one Seven Card Horseshoe seating (paths under still-life/). */

export const DAY1_PRINT_PATH = 'color/driftwood-in-the-wash.jpg';

/** Seat index 1..7 → published relative path. */
export const DAY1_SEATS = [
  'color/driftwood-in-the-wash.jpg',
  'color/creeper-wall.jpg',
  'color/rain-puddle-ripples.jpg',
  'bw/000220500003-pier.jpg',
  'people/bench-dog-waterfront.jpg',
  'shooks_run/tudor.jpg',
  'shooks_run/drawn_tutor.jpg',
] as const;

/** Sheet frames that appear in day 1 and must not recur mid-cycle. */
export const DAY1_SHEET_PATHS = [
  'color/driftwood-in-the-wash.jpg',
  'color/creeper-wall.jpg',
  'color/rain-puddle-ripples.jpg',
  'bw/000220500003-pier.jpg',
  'people/bench-dog-waterfront.jpg',
] as const;

export const CYCLE_CLOSER_PATH = 'people/brass_trojan.jpg';

export const CYCLE_LENGTH = 91;
export const CYCLE_DAYS = 13;
export const SEATS_PER_DAY = 7;
