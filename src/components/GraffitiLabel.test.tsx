import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import GraffitiLabel from './GraffitiLabel';

const graffitiCss = readFileSync(join(process.cwd(), 'src/index.css'), 'utf8');

describe('GraffitiLabel', () => {
  it('keeps unselected cores dark with cream tracing instead of a white fill', () => {
    const { container } = render(<GraffitiLabel text="portraits" />);
    const label = container.querySelector('.graffiti-label');
    const core = container.querySelector('.graffiti-label__core');
    expect(label).not.toHaveClass('graffiti-label--on');
    expect(core).toHaveTextContent('portraits');
    expect(graffitiCss).toMatch(/\.graffiti-label \{[\s\S]*--graffiti-fill: #1a1714;/);
    expect(graffitiCss).toContain('.graffiti-label:not(.graffiti-label--on) .graffiti-label__core');
    expect(graffitiCss).toMatch(/0\.03em 0\.035em 0 #f4eee4/);
    expect(graffitiCss).not.toMatch(/\.graffiti-label:not\(\.graffiti-label--on\)[\s\S]{0,180}#fff/);
    expect(graffitiCss).not.toMatch(/\.graffiti-label__core \{[\s\S]{0,120}color: #fff/);
  });

  it('keeps one accessible copy of the word with a hidden throw-up behind the core', () => {
    const { container } = render(<GraffitiLabel text="gallery" />);
    expect(screen.getByText('gallery', { selector: '.graffiti-label__core' })).toBeInTheDocument();
    const throwUp = container.querySelector('.graffiti-label__throw');
    const core = container.querySelector('.graffiti-label__core');
    expect(throwUp).toHaveAttribute('aria-hidden', 'true');
    expect(throwUp).toHaveTextContent('gallery');
    expect(throwUp?.compareDocumentPosition(core!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(container.querySelector('.graffiti-label--on')).toBeNull();
    expect(core).not.toHaveClass('graffiti-label--on');
  });

  it('turns the fill color on when selected and keeps the shade layer behind', () => {
    const { container } = render(<GraffitiLabel text="portraits" on tone="purple" />);
    const label = container.querySelector('.graffiti-label--on');
    expect(label).toHaveAttribute('data-tone', 'purple');
    expect(label?.querySelector('.graffiti-label__throw')).toBeTruthy();
    expect(label?.querySelector('.graffiti-label__core')).toHaveTextContent('portraits');
  });

  it('paints selected pink for the wordmark and let’s talk', () => {
    const { container } = render(<GraffitiLabel text="let's talk" on tone="pink" />);
    expect(container.querySelector('.graffiti-label--on')).toHaveAttribute('data-tone', 'pink');
    expect(graffitiCss).toMatch(/\.graffiti-label--on\[data-tone='pink'\][\s\S]*--graffiti-throw: #f3b6c8/);
  });
});
