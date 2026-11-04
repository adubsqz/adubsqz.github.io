import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * GitHub Pages cannot set response headers, so `X-Robots-Tag` and
 * `tdm-reservation` headers are unavailable. These static files plus the
 * `index.html` meta tags are the whole origin-side crawler posture; network-level
 * enforcement lives at the Cloudflare edge (docs/ai-crawler-controls.md).
 */
describe('crawler controls', () => {
  const root = process.cwd();
  const robots = readFileSync(join(root, 'public', 'robots.txt'), 'utf8');
  const html = readFileSync(join(root, 'index.html'), 'utf8');

  const groupFor = (userAgent: string): string | undefined =>
    robots
      .split(/\n\s*\n/)
      .find((block) => new RegExp(`^User-agent:\\s*${userAgent}\\s*$`, 'im').test(block));

  it('declares Content Signals that refuse training and grounding but permit search', () => {
    const signal = robots.match(/^Content-Signal:\s*(.+)$/im)?.[1];
    expect(signal).toBeDefined();
    const fields = new Map(
      signal!.split(',').map((part) => {
        const [key, value] = part.split('=').map((token) => token.trim());
        return [key, value];
      }),
    );
    expect(fields.get('search')).toBe('yes');
    expect(fields.get('ai-train')).toBe('no');
    expect(fields.get('ai-input')).toBe('no');
  });

  it('reserves rights under Article 4 of the EU copyright directive', () => {
    expect(robots).toMatch(/EXPRESS RESERVATIONS OF\s*#?\s*RIGHTS UNDER ARTICLE 4/);
  });

  it('closes the password-gated photo directory to every compliant crawler', () => {
    const wildcard = groupFor('\\*');
    expect(wildcard).toBeDefined();
    expect(wildcard).toMatch(/^Disallow:\s*\/photos\/\s*$/im);
  });

  // Each AI crawler needs its own group: a crawler that matches a specific
  // group ignores the `*` group entirely, so directives are never inherited.
  it.each([
    'GPTBot',
    'ClaudeBot',
    'CCBot',
    'Google-Extended',
    'Applebot-Extended',
    'Bytespider',
    'Amazonbot',
    'meta-externalagent',
    'PerplexityBot',
    'ImagesiftBot',
    'img2dataset',
    'ChatGPT-User',
  ])('disallows %s in a group of its own', (userAgent) => {
    const group = groupFor(userAgent);
    expect(group, `no robots.txt group for ${userAgent}`).toBeDefined();
    expect(group).toMatch(/^Disallow:\s*\/\s*$/im);
  });

  it('leaves conventional search crawlers to the permissive default group', () => {
    for (const searchBot of ['Googlebot', 'Bingbot', 'Applebot', 'DuckDuckBot']) {
      expect(groupFor(searchBot), `${searchBot} must not get its own group`).toBeUndefined();
    }
    expect(groupFor('\\*')).toMatch(/^Allow:\s*\/\s*$/im);
  });

  it('reserves text and data mining rights site-wide via TDMRep', () => {
    const raw = readFileSync(join(root, 'public', '.well-known', 'tdmrep.json'), 'utf8');
    const rules = JSON.parse(raw) as Array<{ location: string; 'tdm-reservation': number }>;
    expect(rules).toContainEqual({ location: '/', 'tdm-reservation': 1 });
  });

  it('mirrors the opt-out in index.html without deindexing the site', () => {
    expect(html).toContain('name="tdm-reservation" content="1"');
    const robotsMeta = html.match(/<meta name="robots" content="([^"]+)"/)?.[1];
    expect(robotsMeta).toBeDefined();
    expect(robotsMeta).toContain('noai');
    expect(robotsMeta).toContain('noimageai');
    expect(robotsMeta).toContain('max-image-preview:none');
    expect(robotsMeta).not.toContain('noindex');
  });
});
