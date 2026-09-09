import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/index.css'), 'utf8');
const html = readFileSync(join(process.cwd(), 'index.html'), 'utf8');

describe('chrome CSS', () => {
  it('keeps collection categories on one hidden-scrollbar reel', () => {
    expect(css).toMatch(
      /\.collection-reel \{[\s\S]*flex-wrap: nowrap;[\s\S]*overflow-x: auto;[\s\S]*touch-action: pan-x;[\s\S]*scrollbar-width: none;/,
    );
    expect(css).toContain('.collection-reel::-webkit-scrollbar');
    expect(css).toMatch(/\.graffiti-heading--h2 \{[\s\S]*white-space: nowrap;/);
  });

  it('keeps the handwritten tagline to two lines without a fake pen font', () => {
    expect(css).toMatch(/\.site-tagline \{[\s\S]*width: 100%;/);
    expect(css).toMatch(/\.site-tagline img \{[\s\S]*width: 100%;[\s\S]*height: auto;/);
    expect(css).not.toMatch(/Patrick Hand/);
    expect(html).not.toMatch(/Patrick\+Hand|Patrick Hand/);
    expect(html).toMatch(/family=Nunito/);
    const tagline = join(process.cwd(), 'public', 'tagline.jpg');
    expect(existsSync(tagline)).toBe(true);
    expect(statSync(tagline).size).toBeGreaterThan(20_000);
    expect(statSync(tagline).size).toBeLessThan(250_000);
  });

  it('keeps unselected graffiti cores dark with cream tracing and pink selected fills', () => {
    expect(css).toMatch(/\.graffiti-label \{[\s\S]*--graffiti-fill: #1a1714;/);
    expect(css).toContain('.graffiti-label:not(.graffiti-label--on) .graffiti-label__core');
    expect(css).toMatch(/0\.03em 0\.035em 0 #f4eee4/);
    expect(css).not.toMatch(/\.graffiti-label:not\(\.graffiti-label--on\)[\s\S]{0,180}#fff/);
    expect(css).not.toMatch(/\.graffiti-label__core \{[\s\S]{0,120}color: #fff/);
    expect(css).toMatch(/\.graffiti-label--on\[data-tone='pink'\][\s\S]*--graffiti-throw: #f3b6c8/);
  });
});
