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
    expect(css).toMatch(/\.brand-mark__img--black/);
    expect(css).toMatch(/\.brand-mark--on-light \.brand-mark__img--black/);
    expect(css).not.toMatch(/\.brand-mark__img \{[\s\S]*filter:\s*invert\(1\)/);
    expect(css).toMatch(/\.brand-mark--hero \{[\s\S]*clamp\(2\.4rem/);
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

  it('makers-space shows frames as-is: contain, no cover crop, no forced 3:4 seat', () => {
    expect(css).toMatch(/\.makers-space__img \{[\s\S]*object-fit:\s*contain/);
    expect(css).not.toMatch(/\.makers-space__img \{[\s\S]*object-fit:\s*cover/);
    expect(css).not.toMatch(/\.makers-space__card \{[\s\S]*aspect-ratio:\s*3\s*\/\s*4/);
    expect(css).toMatch(/\.makers-space__img \{[\s\S]*transform:\s*none/);
    expect(css).toMatch(/grid-template-areas:[\s\S]*'s3 \. s5'[\s\S]*'s2 s4 s6'[\s\S]*'s1 \. s7'/);
  });

  it('about sits on grain with XL mark and no proof-plate border chrome', () => {
    expect(css).toMatch(/\.about-on-grain/);
    expect(css).toMatch(/\.brand-mark--about/);
    expect(css).toMatch(/\.proof-plate__frame \{[\s\S]*box-shadow:\s*none/);
    expect(css).toMatch(/\.proof-plate__frame \{[\s\S]*border:\s*0/);
  });
});
