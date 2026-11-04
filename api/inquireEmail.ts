/** Escape user-supplied strings embedded in inquiry notification HTML. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidInquiryEmail(value: string): boolean {
  return typeof value === 'string' && value.length <= 254 && EMAIL_RE.test(value);
}

/** Strip CR/LF and cap length for email subject / header fields. */
export function sanitizeEmailHeader(value: string, maxLen = 200): string {
  return value.replace(/[\r\n]+/g, ' ').trim().slice(0, maxLen);
}

/** Allow site-relative paths or http(s) URLs for photo links in email bodies. */
export function isSafePhotoSrc(value: unknown): boolean {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2048) {
    return false;
  }
  if (value.startsWith('/')) {
    return !value.includes('//') && !/[\r\n]/.test(value);
  }
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export const INQUIRY_RECIPIENT_DEFAULT = 'adubsqz@gmail.com';
