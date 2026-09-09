import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  INSTAGRAM_URL,
  SITE_HOST,
  SITE_OG_IMAGE_PATH,
  SITE_OG_IMAGE_URL,
  SITE_ORIGIN,
  SITE_SHARE_DESCRIPTION,
  SITE_SHARE_TITLE,
  SITE_TAGLINE,
  SITE_TAGLINE_IMAGE,
} from '../src/site';

describe('share card', () => {
  const html = readFileSync(join(process.cwd(), 'index.html'), 'utf8');
  const ogPath = join(process.cwd(), 'public', 'og.jpg');

  it('keeps Open Graph and Twitter tags aligned with the public shop origin', () => {
    expect(html).toContain(`<title>${SITE_SHARE_TITLE}</title>`);
    expect(SITE_TAGLINE).toMatch(/ur momma/i);
    expect(SITE_TAGLINE).toMatch(/house/i);
    expect(SITE_TAGLINE).toMatch(/impression/i);
    expect(SITE_TAGLINE).toMatch(/apology/i);
    expect(SITE_SHARE_DESCRIPTION).toBe(SITE_TAGLINE);
    expect(SITE_TAGLINE_IMAGE).toBe('/tagline.jpg');
    expect(SITE_HOST).toBe('adubsqz.github.io');
    expect(INSTAGRAM_URL).toBe('https://www.instagram.com/adubsqz/');
    expect(html).toContain(`name="description" content="${SITE_SHARE_DESCRIPTION}"`);
    expect(html).toContain(`rel="canonical" href="${SITE_ORIGIN}/"`);
    expect(html).toContain(`property="og:url" content="${SITE_ORIGIN}/"`);
    expect(html).toContain(`property="og:image" content="${SITE_OG_IMAGE_URL}"`);
    expect(html).toContain(`property="og:image:width" content="1200"`);
    expect(html).toContain(`property="og:image:height" content="630"`);
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    expect(html).toContain(`name="twitter:image" content="${SITE_OG_IMAGE_URL}"`);
    expect(SITE_OG_IMAGE_PATH).toBe('/og.jpg');
  });

  it('ships a web-sized og.jpg for link previews', () => {
    expect(existsSync(ogPath)).toBe(true);
    const bytes = statSync(ogPath).size;
    expect(bytes).toBeGreaterThan(8_000);
    expect(bytes).toBeLessThan(400_000);
  });
});
