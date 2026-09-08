import { describe, it, expect } from 'vitest';
import galleryManifest from './gallery-manifest.json';
import { COLLECTIONS, ABOUT, classifyManifestEntry, resolveGalleryImagePath, resolveAboutImagePath } from './data';
import type { Photo, PhotoCollection } from './types';

describe('data', () => {
  describe('COLLECTIONS', () => {
    it('is a non-empty array', () => {
      expect(COLLECTIONS).toBeInstanceOf(Array);
      expect(COLLECTIONS.length).toBeGreaterThan(0);
    });

    it('each collection has required PhotoCollection fields', () => {
      COLLECTIONS.forEach((collection: PhotoCollection) => {
        expect(collection).toHaveProperty('id');
        expect(collection).toHaveProperty('title');
        expect(collection).toHaveProperty('photos');
        expect(typeof collection.id).toBe('string');
        expect(typeof collection.title).toBe('string');
        expect(Array.isArray(collection.photos)).toBe(true);
      });
    });

    it('each photo in collections has required Photo fields', () => {
      COLLECTIONS.forEach((collection: PhotoCollection) => {
        collection.photos.forEach((photo: Photo) => {
          expect(photo).toHaveProperty('id');
          expect(photo).toHaveProperty('src');
          expect(photo).toHaveProperty('alt');
          expect(typeof photo.id).toBe('string');
          expect(typeof photo.src).toBe('string');
          expect(typeof photo.alt).toBe('string');
          expect(photo.src.length).toBeGreaterThan(0);
        });
      });
    });

    it('photo src paths start with /photos/', () => {
      COLLECTIONS.forEach((collection: PhotoCollection) => {
        collection.photos.forEach((photo: Photo) => {
          expect(photo.src).toMatch(/^\/photos\//);
        });
      });
    });

    it('Greyscale / Full Spectrum / Redscale / People tabs (About is manifest `about`, not a tab)', () => {
      const ids = COLLECTIONS.map((c) => c.id).sort();
      expect(ids).toEqual(['full-spectrum', 'greyscale', 'people', 'redscale']);
      const people = COLLECTIONS.find((c) => c.id === 'people');
      expect(people?.title).toBe('People');
      expect((people?.photos.length ?? 0)).toBeGreaterThan(0);
    });

    it('about manifest may be empty until a portrait is republished', () => {
      const manifest = galleryManifest as { about?: string[] };
      expect(Array.isArray(manifest.about)).toBe(true);
    });

    it('reads internal orientation from manifest objects when present (not shown in UI)', () => {
      const withOrientation = COLLECTIONS.flatMap((c) => c.photos).filter((p) => p.orientation);
      const hasObjectRows = COLLECTIONS.some((c) => c.photos.length > 0);
      if (hasObjectRows) {
        expect(withOrientation.length).toBeGreaterThan(0);
      } else {
        expect(withOrientation.length).toBe(0);
      }
    });

    it('keeps scan-id stills that already live in a category folder', () => {
      const greyscale = COLLECTIONS.find((c) => c.id === 'greyscale');
      const color = COLLECTIONS.find((c) => c.id === 'full-spectrum');
      expect(greyscale?.photos.length).toBe(14);
      expect(color?.photos.length).toBe(11);
      expect(greyscale?.photos.some((p) => p.src.includes('30570008-kiln'))).toBe(true);
      expect(color?.photos.some((p) => p.src.includes('000331950014-quartz'))).toBe(true);
    });

    it('does not surface import-########.jpg filenames in public collections', () => {
      const allSrc = COLLECTIONS.flatMap((c) => c.photos.map((p) => p.src));
      for (const src of allSrc) {
        expect(src).not.toMatch(/\/import-\d+\.jpe?g$/i);
      }
    });

    it('uses gallery-manifest.json array order as the reel order', () => {
      const manifest = galleryManifest as {
        bw?: Array<string | { path: string }>;
        color?: Array<string | { path: string }>;
        redscale?: Array<string | { path: string }>;
        people?: Array<string | { path: string }>;
      };
      const rowPath = (row: string | { path: string }) => (typeof row === 'string' ? row : row.path);
      const publicPaths = (rows: Array<string | { path: string }>) =>
        rows.map(rowPath).filter((entry) => classifyManifestEntry(entry).kind === 'public');
      const expected: Record<string, string[]> = {
        greyscale: publicPaths(manifest.bw ?? []),
        'full-spectrum': publicPaths(manifest.color ?? []),
        redscale: publicPaths(manifest.redscale ?? []),
        people: publicPaths(manifest.people ?? []),
      };
      for (const collection of COLLECTIONS) {
        const srcs = collection.photos.map((photo) => {
          const marker = '/photos/still-life/';
          const idx = photo.src.indexOf(marker);
          return decodeURIComponent(idx >= 0 ? photo.src.slice(idx + marker.length) : photo.src);
        });
        expect(srcs).toEqual(expected[collection.id]);
      }
    });

  });

  describe('ABOUT', () => {
    it('has required fields', () => {
      expect(ABOUT).toHaveProperty('name');
      expect(ABOUT).toHaveProperty('tagline');
      expect(ABOUT).toHaveProperty('contactEmail');
      expect(ABOUT.contactEmail).toBe('adubsqz@gmail.com');
      expect(ABOUT).toHaveProperty('bio');
      expect(ABOUT).toHaveProperty('voice');
      expect(ABOUT).toHaveProperty('portfolioPitch');
      expect(ABOUT).toHaveProperty('photoCredit');
      expect(ABOUT).toHaveProperty('socials');
      expect(typeof ABOUT.name).toBe('string');
      expect(typeof ABOUT.bio).toBe('string');
      expect(typeof ABOUT.voice).toBe('string');
      expect(ABOUT.voice).toContain('I am not an AI robot');
      expect(ABOUT.voice).toContain("Let's talk, like humans do");
      expect(ABOUT.portfolioPitch).toContain('lightweight portfolio sites');
      expect(typeof ABOUT.photoCredit).toBe('string');
      expect(Array.isArray(ABOUT.socials)).toBe(true);
    });

    it('socials have name and url', () => {
      ABOUT.socials.forEach((social) => {
        expect(social).toHaveProperty('name');
        expect(social).toHaveProperty('url');
        expect(typeof social.name).toBe('string');
        expect(typeof social.url).toBe('string');
      });
    });
  });

  describe('path helpers', () => {
    it('classifies public buckets and hides junk paths', () => {
      expect(classifyManifestEntry('bw/a.jpg').kind).toBe('public');
      expect(classifyManifestEntry('color/a.jpg').kind).toBe('public');
      expect(classifyManifestEntry('redscale/a.jpg').kind).toBe('public');
      expect(classifyManifestEntry('people/a.jpg').kind).toBe('public');
      expect(classifyManifestEntry('people/a.jpg')).toEqual({ kind: 'public', bucket: 'people' });
      expect(classifyManifestEntry('bw/30570008-kiln.JPG')).toEqual({ kind: 'public', bucket: 'greyscale' });
      expect(classifyManifestEntry('color/000331950014-quartz.jpg')).toEqual({
        kind: 'public',
        bucket: 'full-spectrum',
      });
      expect(classifyManifestEntry('bw/bear12.jpg')).toEqual({ kind: 'public', bucket: 'greyscale' });
      expect(classifyManifestEntry('bw/importone.jpg')).toEqual({ kind: 'public', bucket: 'greyscale' });
      expect(classifyManifestEntry('import-1.jpg')).toEqual({ kind: 'hidden', reason: 'import_numeric' });
      expect(classifyManifestEntry('bw/import-1.jpg')).toEqual({ kind: 'hidden', reason: 'import_numeric' });
      expect(classifyManifestEntry('12.jpg')).toEqual({ kind: 'hidden', reason: 'numeric_only_filename' });
      expect(classifyManifestEntry('note.txt')).toEqual({ kind: 'hidden', reason: 'unsupported_mime' });
      expect(classifyManifestEntry('other/a.jpg')).toEqual({ kind: 'hidden', reason: 'unsupported_path' });
      expect(resolveGalleryImagePath('greyscale', '')).toBe('');
      expect(resolveGalleryImagePath('greyscale', 'plain.jpg')).toContain('/greyscale/plain.jpg');
      expect(resolveAboutImagePath('')).toBe('');
      expect(resolveAboutImagePath('about.jpg')).toContain('/photos/still-life/about.jpg');
    });
  });
});
