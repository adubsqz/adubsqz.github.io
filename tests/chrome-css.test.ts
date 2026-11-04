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

  it('keeps gate ink continuity with a soft table glow under the film body', () => {
    expect(css).toMatch(/background-color:\s*#1a1714/);
    expect(css).toMatch(/\.lookbook-ink/);
    expect(css).toMatch(/\.lookbook-rail/);
    expect(css).toMatch(/\.grease-pencil/);
    expect(css).toMatch(/\.brand-mark \{[\s\S]*font-size:\s*1\.35rem/);
    expect(css).toMatch(/\.brand-mark \{[\s\S]*Audiowide/);
    expect(css).toMatch(/\.brand-mark--hero \{[\s\S]*clamp\(2\.4rem/);
    expect(html).toMatch(/family=Audiowide/);
    expect(html).toMatch(/family=Exo\+2|family=Exo%202/);
    expect(html).not.toMatch(/family=Newsreader/);
    expect(html).not.toMatch(/family=Nunito/);
  });

  it('uses Exo 2 for UI chrome and Audiowide for the wordmark', () => {
    expect(css).toMatch(/font-family:\s*"Exo 2"/);
    expect(css).toMatch(/\.brand-mark \{[\s\S]*font-family:\s*"Audiowide"/);
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
