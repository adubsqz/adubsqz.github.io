/** Target Cache-Control for published gallery JPEGs (stable paths, overwrite on re-import). */
export const PHOTO_CACHE_MAX_AGE_SECONDS = 604_800;
export const PHOTO_CACHE_STALE_WHILE_REVALIDATE_SECONDS = 86_400;

export const PHOTO_CACHE_CONTROL = `public, max-age=${PHOTO_CACHE_MAX_AGE_SECONDS}, stale-while-revalidate=${PHOTO_CACHE_STALE_WHILE_REVALIDATE_SECONDS}`;

/** Cloudflare Rules expression — GET still-life and contact-sheet thumbs only. */
export const PHOTO_CACHE_RULE_EXPRESSION =
  '(starts_with(http.request.uri.path, "/photos/still-life/") or starts_with(http.request.uri.path, "/photos/sheet/")) and http.request.method eq "GET"';

const PHOTO_PREFIXES = ['/photos/still-life/', '/photos/sheet/'] as const;
const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;

/** Dev/preview middleware: match gallery image URLs under public/photos/. */
export function isGalleryPhotoRequest(pathname: string): boolean {
  const path = decodeURIComponent(pathname.split('?')[0] ?? '');
  if (!PHOTO_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return false;
  }
  const baseName = path.split('/').pop() ?? path;
  return IMAGE_EXT.test(baseName);
}
