import { describe, expect, it } from 'vitest';
import {
  PHOTO_CACHE_CONTROL,
  PHOTO_CACHE_MAX_AGE_SECONDS,
  PHOTO_CACHE_RULE_EXPRESSION,
  PHOTO_CACHE_STALE_WHILE_REVALIDATE_SECONDS,
  isGalleryPhotoRequest,
} from '../hosting/photo-cache';

describe('gallery photo cache constants', () => {
  it('uses one-week max-age with one-day stale-while-revalidate (no immutable)', () => {
    expect(PHOTO_CACHE_MAX_AGE_SECONDS).toBe(604_800);
    expect(PHOTO_CACHE_STALE_WHILE_REVALIDATE_SECONDS).toBe(86_400);
    expect(PHOTO_CACHE_CONTROL).toBe(
      'public, max-age=604800, stale-while-revalidate=86400',
    );
    expect(PHOTO_CACHE_CONTROL).not.toContain('immutable');
  });

  it('matches Cloudflare expression for still-life and sheet GETs', () => {
    expect(PHOTO_CACHE_RULE_EXPRESSION).toContain('/photos/still-life/');
    expect(PHOTO_CACHE_RULE_EXPRESSION).toContain('/photos/sheet/');
    expect(PHOTO_CACHE_RULE_EXPRESSION).toContain('GET');
  });
});

describe('isGalleryPhotoRequest', () => {
  it('matches manifest still paths and sheet thumbs', () => {
    expect(isGalleryPhotoRequest('/photos/still-life/color/cheers.jpg')).toBe(true);
    expect(isGalleryPhotoRequest('/photos/sheet/bw/thumb-001.jpg')).toBe(true);
  });

  it('ignores HTML and non-photo paths', () => {
    expect(isGalleryPhotoRequest('/')).toBe(false);
    expect(isGalleryPhotoRequest('/photos/still-life/color/readme.txt')).toBe(false);
    expect(isGalleryPhotoRequest('/assets/index-deadbeef.js')).toBe(false);
  });
});
