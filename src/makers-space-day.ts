import { COLLECTIONS } from './data';
import { arrangeContactSheet, stillLifePathFromSrc } from './gallery-sheet-order';
import { buildMakersSpaceCycle, windowForDay } from './makers-space-cycle';
import { CYCLE_DAYS } from './makers-space-day1';

/** First calendar day of the rotation (America/Denver). */
export const MAKERS_SPACE_EPOCH = '2026-11-04';

const DENVER = 'America/Denver';

function denverDateKey(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: DENVER,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/** 1-based day in the 13-day cycle for `now` (Denver calendar). */
export function makersSpaceDayNumber(now: Date = new Date()): number {
  const today = denverDateKey(now);
  const epochMs = Date.parse(`${MAKERS_SPACE_EPOCH}T12:00:00-07:00`);
  const todayMs = Date.parse(`${today}T12:00:00-07:00`);
  const diffDays = Math.floor((todayMs - epochMs) / 86_400_000);
  const index = ((diffDays % CYCLE_DAYS) + CYCLE_DAYS) % CYCLE_DAYS;
  return index + 1;
}

export function sheetPathsInContactOrder(): string[] {
  return arrangeContactSheet(COLLECTIONS).map((photo) => stillLifePathFromSrc(photo.src));
}

export function todaysMakersSpaceSeats(now: Date = new Date()): string[] {
  const cycle = buildMakersSpaceCycle(sheetPathsInContactOrder());
  return windowForDay(cycle, makersSpaceDayNumber(now));
}

export function stillLifeUrl(relativePath: string): string {
  const base = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
  const root = (base.endsWith('/') ? base.slice(0, -1) : base) + '/photos/still-life';
  // Cache-buster so browsers that stored earlier Vite allowlist 404s refetch publishes.
  return `${root}/${relativePath.replace(/^\//, '')}?v=makers-1`;
}
