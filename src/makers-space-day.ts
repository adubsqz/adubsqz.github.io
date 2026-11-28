import { COLLECTIONS } from './data';
import { arrangeContactSheet, stillLifePathFromSrc } from './gallery-sheet-order';
import { buildMakersSpaceCycle, cycleDays, windowForDay } from './makers-space-cycle';

/** Calendar day 1 of the rotation in America/Denver (ship day on main). */
export const MAKERS_SPACE_EPOCH = '2026-11-05';

const DENVER = 'America/Denver';

function denverDateKey(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: DENVER,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export function sheetPathsInContactOrder(): string[] {
  return arrangeContactSheet(COLLECTIONS).map((photo) => stillLifePathFromSrc(photo.src));
}

export function makersSpaceCycle(): string[] {
  return buildMakersSpaceCycle(sheetPathsInContactOrder());
}

/** 1-based day in the current horseshoe cycle for `now` (Denver calendar). */
export function makersSpaceDayNumber(now: Date = new Date()): number {
  const days = cycleDays(makersSpaceCycle());
  if (days < 1) return 1;
  const today = denverDateKey(now);
  const epochMs = Date.parse(`${MAKERS_SPACE_EPOCH}T12:00:00-07:00`);
  const todayMs = Date.parse(`${today}T12:00:00-07:00`);
  const diffDays = Math.floor((todayMs - epochMs) / 86_400_000);
  const index = ((diffDays % days) + days) % days;
  return index + 1;
}

export function todaysMakersSpaceSeats(now: Date = new Date()): string[] {
  const cycle = makersSpaceCycle();
  return windowForDay(cycle, makersSpaceDayNumber(now));
}

function photosRoot(kind: 'still-life' | 'sheet'): string {
  const base = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
  return (base.endsWith('/') ? base.slice(0, -1) : base) + `/photos/${kind}`;
}

export function stillLifeUrl(relativePath: string): string {
  // Cache-buster so browsers that stored earlier Vite allowlist 404s refetch publishes.
  return `${photosRoot('still-life')}/${relativePath.replace(/^\//, '')}?v=makers-1`;
}

/** Contact-sheet / horseshoe grid thumb (~640px). Lightbox keeps {@link stillLifeUrl}. */
export function sheetUrl(relativePath: string): string {
  return `${photosRoot('sheet')}/${relativePath.replace(/^\//, '')}?v=makers-1`;
}
