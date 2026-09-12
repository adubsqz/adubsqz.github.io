import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BackToTop from './BackToTop';

describe('BackToTop', () => {
  it('stays hidden until the page is scrolled, then returns to the top', async () => {
    const user = userEvent.setup();
    const scrollTo = vi.fn();
    window.scrollTo = scrollTo as typeof window.scrollTo;
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0, writable: true });

    render(<BackToTop />);
    expect(screen.queryByRole('button', { name: /back to top/i })).not.toBeInTheDocument();

    Object.defineProperty(window, 'scrollY', { configurable: true, value: 400, writable: true });
    window.dispatchEvent(new Event('scroll'));
    expect(await screen.findByRole('button', { name: /back to top/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /back to top/i }));
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
  });

  it('uses instant scroll when the visitor prefers reduced motion', async () => {
    const user = userEvent.setup();
    const scrollTo = vi.fn();
    window.scrollTo = scrollTo as typeof window.scrollTo;
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 400, writable: true });
    window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() });

    render(<BackToTop />);
    window.dispatchEvent(new Event('scroll'));
    await user.click(await screen.findByRole('button', { name: /back to top/i }));
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });
  });
});
