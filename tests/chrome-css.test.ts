import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/index.css'), 'utf8');
const html = readFileSync(join(process.cwd(), 'index.html'), 'utf8');

describe('chrome CSS', () => {
  it('does not reserve sticky-header scroll offset', () => {
    expect(css).not.toMatch(/scroll-padding-top/);
    expect(css).not.toMatch(/\.gallery-still \{[\s\S]*scroll-margin-top/);
  });

  it('uses a white page and a small serif wordmark', () => {
    expect(css).toMatch(/background-color:\s*#fff/);
    expect(css).toMatch(/\.brand-mark \{[\s\S]*font-size:\s*1\.35rem/);
    expect(css).toMatch(/\.brand-mark \{[\s\S]*Newsreader/);
    expect(css).not.toMatch(/clamp\(2\.4rem/);
    expect(html).toMatch(/family=Nunito/);
    expect(html).toMatch(/family=Newsreader/);
  });

  it('drops the graffiti chrome, collection reel, and spray-paint font', () => {
    expect(css).not.toMatch(/\.graffiti-/);
    expect(css).not.toMatch(/\.collection-reel/);
    expect(css).not.toMatch(/\.site-tagline/);
    expect(css).not.toMatch(/\.cinematic-grid/);
    expect(html).not.toMatch(/Rubik\+Spray\+Paint|Rubik Spray Paint/);
    expect(html).not.toMatch(/Patrick\+Hand|Patrick Hand/);
  });
});
