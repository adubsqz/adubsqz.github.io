import { describe, it, expect } from 'vitest';
import { escapeHtml, isSafePhotoSrc, isValidInquiryEmail, sanitizeEmailHeader } from '../api/inquireEmail.ts';

describe('inquireEmail helpers', () => {
  it('escapeHtml neutralizes markup', () => {
    expect(escapeHtml('<b>"x"</b>')).toBe('&lt;b&gt;&quot;x&quot;&lt;/b&gt;');
  });

  it('isValidInquiryEmail accepts normal addresses', () => {
    expect(isValidInquiryEmail('adubsqz@gmail.com')).toBe(true);
    expect(isValidInquiryEmail('info@adubs.site')).toBe(true);
    expect(isValidInquiryEmail('not-an-email')).toBe(false);
  });

  it('isSafePhotoSrc allows relative gallery paths only when safe', () => {
    expect(isSafePhotoSrc('/photos/still-life/bw/1.jpg')).toBe(true);
    expect(isSafePhotoSrc('javascript:alert(1)')).toBe(false);
    expect(isSafePhotoSrc('https://adubs.site/photos/1.jpg')).toBe(true);
  });

  it('sanitizeEmailHeader strips newlines for subject safety', () => {
    expect(sanitizeEmailHeader('hello\r\nBcc: evil@x.com')).toBe('hello Bcc: evil@x.com');
  });
});
