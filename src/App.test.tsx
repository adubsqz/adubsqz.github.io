import { describe, it, expect } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { SITE_TAGLINE, SITE_TAGLINE_IMAGE } from './site';

describe('App', () => {
  it('pans the collection reel with the wheel while hovered', () => {
    render(<App />);
    const reel = screen.getByRole('navigation', { name: /collections/i });
    Object.defineProperty(reel, 'scrollWidth', { configurable: true, value: 900 });
    Object.defineProperty(reel, 'clientWidth', { configurable: true, value: 300 });
    let left = 0;
    Object.defineProperty(reel, 'scrollLeft', {
      configurable: true,
      get: () => left,
      set: (value: number) => {
        left = value;
      },
    });
    reel.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true }));
    expect(left).toBe(0);
    reel.dispatchEvent(new WheelEvent('wheel', { deltaX: 80, deltaY: 10, bubbles: true, cancelable: true }));
    expect(left).toBe(90);
    reel.dispatchEvent(new WheelEvent('wheel', { deltaY: 40, shiftKey: true, bubbles: true, cancelable: true }));
    expect(left).toBe(130);
  });

  it('lets the site header scroll away so it does not cover stills', () => {
    const { container } = render(<App />);
    const header = container.querySelector('header.site-header');
    expect(header).toBeTruthy();
    expect(header).not.toHaveClass('sticky');
    expect(header?.className ?? '').not.toMatch(/\bsticky\b/);
    expect(header).toHaveAttribute('id', 'top');
    expect(container.querySelector('main')?.className.split(' ')).toContain('bg-white');
    expect(container.querySelector('.gallery-shell')?.className.split(' ')).toContain('bg-white');
    expect(screen.queryByRole('button', { name: /back to top/i })).not.toBeInTheDocument();
  });

  it('shows back to top after the gallery is scrolled', async () => {
    render(<App />);
    act(() => {
      Object.defineProperty(window, 'scrollY', { configurable: true, value: 400, writable: true });
      window.dispatchEvent(new Event('scroll'));
    });
    expect(await screen.findByRole('button', { name: /back to top/i })).toBeInTheDocument();
  });

  it('does not mount back to top on About', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'adubsqz' }));
    expect(await screen.findByText(/I am not an AI robot/i)).toBeInTheDocument();
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 400, writable: true });
    window.dispatchEvent(new Event('scroll'));
    expect(screen.queryByRole('button', { name: /back to top/i })).not.toBeInTheDocument();
  });

  it('renders a graffiti wordmark, tagline, and a single-line collection reel', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'adubsqz' })).toHaveClass('brand-mark');
    expect(screen.getByRole('button', { name: 'adubsqz' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'adubsqz' }).querySelector('.graffiti-label--on')).toHaveAttribute(
      'data-tone',
      'pink',
    );
    const tagline = screen.getByRole('img', { name: SITE_TAGLINE });
    expect(tagline).toHaveAttribute('src', SITE_TAGLINE_IMAGE);
    expect(tagline.closest('.site-tagline')).toBeTruthy();
    expect(screen.queryByText(/Patrick Hand/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/about me/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^gallery$/i })).not.toBeInTheDocument();
    const reel = screen.getByRole('navigation', { name: /collections/i });
    expect(reel).toHaveClass('collection-reel');
    expect(screen.getByRole('button', { name: /greyscale/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /full spectrum/i }).querySelector('.graffiti-label--on')).toBeNull();
    expect(screen.getByRole('button', { name: /redscale/i }).querySelector('.graffiti-label--on')).toBeNull();
    expect(screen.getByRole('button', { name: /^portraits$/i }).querySelector('.graffiti-label--on')).toBeNull();
    expect(screen.getByRole('button', { name: /^portraits$/i }).querySelector('.graffiti-label__core')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /about me/i })).not.toBeInTheDocument();
    expect(reel.querySelectorAll('h2')).toHaveLength(4);
  });

  it('opens About from the adubsqz wordmark', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'adubsqz' }));
    expect(screen.getByRole('button', { name: 'adubsqz' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('button', { name: /^gallery$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: /collections/i })).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: SITE_TAGLINE })).toBeInTheDocument();
    expect(await screen.findByText(/I am not an AI robot/i)).toBeInTheDocument();
    expect(screen.getByText(/lightweight portfolio sites for photographers/i)).toBeInTheDocument();
    const talk = screen.getByRole('button', { name: /let's talk/i });
    expect(talk.querySelector('.graffiti-label--on')).toHaveAttribute('data-tone', 'pink');
  });

  it('shows Gallery view by default', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /greyscale/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /full spectrum/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /redscale/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^portraits$/i })).toBeInTheDocument();
  });

  it('returns to Gallery when the wordmark is clicked from About', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'adubsqz' }));
    expect(screen.queryByRole('navigation', { name: /collections/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'adubsqz' }));
    expect(screen.getByRole('button', { name: 'adubsqz' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('navigation', { name: /collections/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /greyscale/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText(/I am not an AI robot/i)).not.toBeInTheDocument();
  });

  it('opens contact modal from About', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'adubsqz' }));
    await user.click(await screen.findByRole('button', { name: /let's talk/i }));
    expect(await screen.findByRole('dialog', { name: /contact/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('switches gallery collection filters', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /^full spectrum$/i }));
    expect(screen.getByRole('button', { name: /^full spectrum$/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /greyscale/i })).toHaveAttribute('aria-pressed', 'false');
    await user.click(screen.getByRole('button', { name: /^redscale$/i }));
    expect(screen.getByRole('button', { name: /^redscale$/i })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: /^portraits$/i }));
    expect(screen.getByRole('button', { name: /^portraits$/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('button', { name: /open photo/i }).length).toBe(14);
    expect(screen.queryByRole('button', { name: /next page/i })).not.toBeInTheDocument();
  });

  it('keeps rights copy on About only once and restores the gallery footer', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByText(/rights reserved/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'adubsqz' }));
    expect(await screen.findByText(/lightweight portfolio sites/i)).toBeInTheDocument();
    expect(screen.getAllByText(/rights reserved/i)).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'adubsqz' }));
    expect(screen.getByText(/rights reserved/i)).toBeInTheDocument();
  });

  it('closes contact modal when Close is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'adubsqz' }));
    await user.click(await screen.findByRole('button', { name: /let's talk/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
