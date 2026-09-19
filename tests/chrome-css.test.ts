import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/index.css'), 'utf8');
const html = readFileSync(join(process.cwd(), 'index.html'), 'utf8');

describe('chrome CSS', () => {
  it('does not reserve sticky-header scroll offset', () => {
    expect(css).not.toMatch(/scroll-padding-top/);
    expect(css).not.toMatch(/\.gallery-still \{[\s\S]*scroll-margin-top/);
  });

  // Replaces an earlier single-row reel that hid three of four collections behind
  // an invisible scrollbar on a phone. Wrapping keeps every collection on screen.
  it('wraps collection categories instead of scrolling them off screen', () => {
    expect(css).toMatch(/\.collection-reel \{[\s\S]*flex-wrap: wrap;/);
    expect(css).not.toMatch(/\.collection-reel \{[\s\S]*?\}\s*[\s\S]*?touch-action: pan-x;/);
    expect(css).not.toContain('.collection-reel::-webkit-scrollbar');
    // Individual labels still never break mid-word; only the row does.
    expect(css).toMatch(/\.graffiti-heading--h2 \{[\s\S]*white-space: nowrap;/);
  });

  it('scales collection labels up monotonically so they never shrink as the viewport grows', () => {
    const sizes = [...css.matchAll(/\.graffiti-heading--h2 \{[^}]*?font-size: ([\d.]+)rem/g)].map((m) =>
      Number(m[1]),
    );
    expect(sizes.length).toBeGreaterThanOrEqual(4);
    expect(sizes).toStrictEqual([...sizes].sort((a, b) => a - b));
    // Desktop keeps the original display size.
    expect(sizes.at(-1)).toBe(2.16);
  });

  it('gives the selected collection a tag highlight without lightening unselected cores', () => {
    expect(css).toMatch(
      /\.graffiti-label--on \.graffiti-label__core \{[\s\S]*?text-shadow:[\s\S]*?-0\.045em -0\.055em 0 #fffdf6/,
    );
    // The shine sits opposite the down-right drop shadow, which must survive.
    expect(css).toMatch(
      /\.graffiti-label--on \.graffiti-label__core \{[\s\S]*?0\.04em 0\.05em 0 #1a1714/,
    );
    expect(css).toMatch(/\.graffiti-label \{[\s\S]*letter-spacing: 0\.015em;/);
    expect(css).toMatch(/\.graffiti-label \{[\s\S]*word-spacing:/);
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
