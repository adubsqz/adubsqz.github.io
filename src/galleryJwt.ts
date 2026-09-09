/**
 * Client JWT for the GitHub Pages shop. There is no server to hold a secret,
 * so this is a 15-minute privacy gate, not authentication.
 */
const textEncoder = new TextEncoder();

export const GALLERY_PASSWORD = 'sqz';
export const GALLERY_JWT_TTL_MS = 15 * 60 * 1000;
export const GALLERY_JWT_STORAGE_KEY = 'adubsqz.gallery.jwt';

const JWT_HEADER = utf8ToBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
const JWT_SECRET = 'adubsqz-gallery-hs256';

export function galleryGateBypassed(): boolean {
  return import.meta.env.VITE_E2E === '1';
}

export async function mintGalleryJwt(password: string): Promise<string | null> {
  if (!passwordsMatch(password, GALLERY_PASSWORD)) return null;
  const nowSec = Math.floor(Date.now() / 1000);
  const payload = utf8ToBase64Url(
    JSON.stringify({
      sub: 'gallery',
      iat: nowSec,
      exp: nowSec + GALLERY_JWT_TTL_MS / 1000,
    }),
  );
  const signingInput = `${JWT_HEADER}.${payload}`;
  const sig = await hmacSha256(JWT_SECRET, signingInput);
  return `${signingInput}.${sig}`;
}

export async function verifyGalleryJwt(token: string): Promise<boolean> {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [header, payload, sig] = parts;
  if (!header || !payload || !sig) return false;
  if (header !== JWT_HEADER) return false;

  let claims: { exp?: unknown; sub?: unknown };
  try {
    claims = JSON.parse(base64UrlToUtf8(payload)) as { exp?: unknown; sub?: unknown };
  } catch {
    return false;
  }
  if (claims.sub !== 'gallery' || typeof claims.exp !== 'number') return false;
  if (claims.exp * 1000 <= Date.now()) return false;

  const expected = await hmacSha256(JWT_SECRET, `${header}.${payload}`);
  return passwordsMatch(sig, expected);
}

export function readStoredGalleryJwt(): string | null {
  try {
    const value = window.localStorage.getItem(GALLERY_JWT_STORAGE_KEY);
    return value && value.trim() ? value.trim() : null;
  } catch {
    return null;
  }
}

export function writeStoredGalleryJwt(token: string): void {
  try {
    window.localStorage.setItem(GALLERY_JWT_STORAGE_KEY, token);
  } catch {
    // Private mode can throw; session is lost on reload.
  }
}

export function clearStoredGalleryJwt(): void {
  try {
    window.localStorage.removeItem(GALLERY_JWT_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export async function hasValidGallerySession(): Promise<boolean> {
  const token = readStoredGalleryJwt();
  if (!token) return false;
  const ok = await verifyGalleryJwt(token);
  if (!ok) clearStoredGalleryJwt();
  return ok;
}

function passwordsMatch(a: string, b: string): boolean {
  const left = textEncoder.encode(a);
  const right = textEncoder.encode(b);
  let diff = left.length ^ right.length;
  const len = Math.max(left.length, right.length);
  for (let i = 0; i < len; i += 1) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}

async function hmacSha256(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, textEncoder.encode(value));
  return bytesToBase64Url(new Uint8Array(sig));
}

function utf8ToBase64Url(value: string): string {
  return bytesToBase64Url(textEncoder.encode(value));
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToUtf8(value: string): string {
  const pad = value.length % 4 === 0 ? '' : '='.repeat(4 - (value.length % 4));
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}
