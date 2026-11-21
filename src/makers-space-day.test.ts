import { describe, expect, it } from 'vitest';
import {
  MAKERS_SPACE_EPOCH,
  makersSpaceDayNumber,
  stillLifeUrl,
  todaysMakersSpaceSeats,
} from './makers-space-day';
import { DAY1_SEATS, CYCLE_LENGTH, PORTFOLIO_ONLY_STILL_LIFE_PATHS, SEATS_PER_DAY } from './makers-space-day1';
import { buildMakersSpaceCycle } from './makers-space-cycle';
import { sheetPathsInContactOrder } from './makers-space-day';

describe('makers-space day window', () => {
  it('keeps portfolio-only NYC imports off the Work horseshoe cycle', () => {
    const cycle = buildMakersSpaceCycle(sheetPathsInContactOrder());
    expect(cycle).toHaveLength(CYCLE_LENGTH);
    expect(cycle.length % SEATS_PER_DAY).toBe(0);
    for (const path of PORTFOLIO_ONLY_STILL_LIFE_PATHS) {
      expect(cycle).not.toContain(path);
    }
  });
  it('treats the Denver epoch as day 1', () => {
    expect(MAKERS_SPACE_EPOCH).toBe('2026-11-05');
    expect(makersSpaceDayNumber(new Date('2026-11-05T18:00:00-07:00'))).toBe(1);
    expect(todaysMakersSpaceSeats(new Date('2026-11-05T18:00:00-07:00'))).toEqual([...DAY1_SEATS]);
    // Day after epoch is day 2 (not still the opening horseshoe)
    expect(makersSpaceDayNumber(new Date('2026-11-06T12:00:00-07:00'))).toBe(2);
  });

  it('builds still-life URLs under /photos/still-life/', () => {
    expect(stillLifeUrl('color/driftwood-in-the-wash.jpg')).toBe(
      '/photos/still-life/color/driftwood-in-the-wash.jpg?v=makers-1',
    );
  });
});
