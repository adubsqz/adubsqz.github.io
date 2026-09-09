import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import GraffitiLabel from './GraffitiLabel';

describe('GraffitiLabel', () => {
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
  });
});
