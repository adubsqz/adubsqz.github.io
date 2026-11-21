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

/**
 * Portfolio-only publishes (full contact sheet) that must not enter the
 * 91-frame / 13-day Work horseshoe rotation — length must stay divisible by 7.
 */
export const PORTFOLIO_ONLY_STILL_LIFE_PATHS = new Set<string>([
  'color/lic-rooftop-verizon-skyline.jpg',
  'color/wet-court-cobbles.jpg',
  'color/subway-globe-empire.jpg',
  'color/gen-korean-bbq-dusk.jpg',
  'people/sidewalk-dog-bike-share.jpg',
  'people/trojan-horns-band-floor.jpg',
  'people/trojan-horns-exit-34.jpg',
  'people/trojan-horns-sax-closeup.jpg',
  'people/trojan-horns-trombone-sax.jpg',
  'people/trojan-horns-trumpet-dutch.jpg',
]);
