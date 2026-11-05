import { describe, expect, it } from 'vitest';
import {
  MAKERS_SPACE_EPOCH,
  makersSpaceDayNumber,
  stillLifeUrl,
  todaysMakersSpaceSeats,
} from './makers-space-day';
import { DAY1_SEATS } from './makers-space-day1';

describe('makers-space day window', () => {
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
