import { describe, expect, it } from 'vitest';
import { COLLECTIONS } from './data';
import { arrangeContactSheet, stillLifePathFromSrc } from './gallery-sheet-order';
import {
  CYCLE_CLOSER_PATH,
  DAY1_PRINT_PATH,
  DAY1_SEATS,
  DAY1_SHEET_PATHS,
  SEATS_PER_DAY,
} from './makers-space-day1';
import { buildMakersSpaceCycle, cycleDays, windowForDay } from './makers-space-cycle';

describe('makers-space fixed cycle', () => {
  const sheetPaths = arrangeContactSheet(COLLECTIONS).map((photo) =>
    stillLifePathFromSrc(photo.src),
  );

  it('exposes a day-one seating of seven with driftwood as the print', () => {
    expect(DAY1_SEATS).toHaveLength(SEATS_PER_DAY);
    expect(DAY1_SEATS[0]).toBe(DAY1_PRINT_PATH);
    expect(DAY1_SEATS[3]).toBe('bw/000220500003-pier.jpg');
    expect(DAY1_SEATS[4]).toBe('people/bench-dog-waterfront.jpg');
    expect(DAY1_SEATS[5]).toBe('shooks_run/tudor.jpg');
    expect(DAY1_SEATS[6]).toBe('shooks_run/drawn_tutor.jpg');
  });

  it('builds day1, then sheet without day1 seats, then brass_trojan — length divisible by 7', () => {
    const cycle = buildMakersSpaceCycle(sheetPaths);
    const days = cycleDays(cycle);

    expect(cycle.length % SEATS_PER_DAY).toBe(0);
    expect(days).toBe(cycle.length / SEATS_PER_DAY);
    expect(days).toBeGreaterThanOrEqual(13);
    expect(cycle.slice(0, SEATS_PER_DAY)).toEqual([...DAY1_SEATS]);
    expect(cycle[cycle.length - 1]).toBe(CYCLE_CLOSER_PATH);

    const mid = cycle.slice(SEATS_PER_DAY, -1);
    for (const path of DAY1_SHEET_PATHS) {
      expect(mid).not.toContain(path);
    }
    expect(mid[0]).toBe('people/guardian-classic-layup.jpg');
    expect(new Set(cycle).size).toBe(cycle.length);
  });

  it('selects seven seats per day and wraps after the last cycle day', () => {
    const cycle = buildMakersSpaceCycle(sheetPaths);
    const days = cycleDays(cycle);

    expect(windowForDay(cycle, 1)).toEqual([...DAY1_SEATS]);
    expect(windowForDay(cycle, 2)?.[0]).toBe('people/guardian-classic-layup.jpg');
    expect(windowForDay(cycle, days)?.at(-1)).toBe(CYCLE_CLOSER_PATH);
    expect(windowForDay(cycle, days + 1)).toEqual(windowForDay(cycle, 1));
    expect(windowForDay(cycle, 0)).toEqual(windowForDay(cycle, days));
  });

  it('wraps negative day indexes the same way as positive overflow', () => {
    const cycle = buildMakersSpaceCycle(sheetPaths);
    const days = cycleDays(cycle);
    expect(windowForDay(cycle, -1)).toEqual(windowForDay(cycle, days - 1));
    expect(windowForDay(cycle, -(days - 1))).toEqual(windowForDay(cycle, 1));
  });

  it('keeps brass_trojan only once even if it already appears on the sheet list', () => {
    const withCloser = [...sheetPaths, CYCLE_CLOSER_PATH];
    const cycle = buildMakersSpaceCycle(withCloser);
    expect(cycle.filter((path) => path === CYCLE_CLOSER_PATH)).toHaveLength(1);
    expect(cycle.at(-1)).toBe(CYCLE_CLOSER_PATH);
    expect(cycle.length % SEATS_PER_DAY).toBe(0);
  });
});
