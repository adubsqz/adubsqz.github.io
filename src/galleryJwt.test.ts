import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GALLERY_JWT_STORAGE_KEY,
  GALLERY_JWT_TTL_MS,
  clearStoredGalleryJwt,
  hasValidGallerySession,
  mintGalleryJwt,
  readStoredGalleryJwt,
  verifyGalleryJwt,
  writeStoredGalleryJwt,
} from './galleryJwt';

describe('galleryJwt', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    window.localStorage.clear();
  });

  it('mints a three-part JWT for sqz and rejects other passwords', async () => {
    expect(await mintGalleryJwt('nope')).toBeNull();
    const token = await mintGalleryJwt('sqz');
    expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    expect(await verifyGalleryJwt(token ?? '')).toBe(true);
  });

  it('rejects a tampered payload', async () => {
    const token = await mintGalleryJwt('sqz');
    expect(token).toBeTruthy();
    const [header, payload, sig] = token!.split('.');
    const flipped = payload.endsWith('A') ? `${payload.slice(0, -1)}B` : `${payload}A`;
    expect(await verifyGalleryJwt(`${header}.${flipped}.${sig}`)).toBe(false);
  });

  it('rejects an expired JWT and clears storage', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-09T12:00:00.000Z'));
    const token = await mintGalleryJwt('sqz');
    expect(token).toBeTruthy();
    writeStoredGalleryJwt(token!);
    expect(await hasValidGallerySession()).toBe(true);

    vi.setSystemTime(new Date(Date.now() + GALLERY_JWT_TTL_MS + 1000));
    expect(await verifyGalleryJwt(token!)).toBe(false);
    expect(await hasValidGallerySession()).toBe(false);
    expect(readStoredGalleryJwt()).toBeNull();
    expect(window.localStorage.getItem(GALLERY_JWT_STORAGE_KEY)).toBeNull();
  });

  it('round-trips a stored token until it is cleared', async () => {
    const token = await mintGalleryJwt('sqz');
    writeStoredGalleryJwt(token!);
    expect(readStoredGalleryJwt()).toBe(token);
    clearStoredGalleryJwt();
    expect(readStoredGalleryJwt()).toBeNull();
  });
});
