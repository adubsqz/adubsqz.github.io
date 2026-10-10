import { describe, it, expect } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

describe('App', () => {
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
    await user.click(screen.getByRole('button', { name: /^about$/i }));
    expect(await screen.findByText(/I take 35mm and medium format film photography/i)).toBeInTheDocument();
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 400, writable: true });
    window.dispatchEvent(new Event('scroll'));
    expect(screen.queryByRole('button', { name: /back to top/i })).not.toBeInTheDocument();
  });

  it('renders a plain wordmark and Work / About, without categories or the handwritten note', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'adubsqz' })).toHaveClass('brand-mark');
    expect(screen.getByRole('button', { name: /^work$/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^about$/i })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('img', { name: /printable film photography/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: /collections/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/about me/i)).not.toBeInTheDocument();
  });

  it('opens About from the nav and keeps the written copy', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /^about$/i }));
    expect(screen.getByRole('button', { name: /^about$/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^work$/i })).toHaveAttribute('aria-pressed', 'false');
    expect(await screen.findByText(/I take 35mm and medium format film photography/i)).toBeInTheDocument();
    expect(screen.getByText(/AWS Certified AI Practitioner/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /let's talk/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^gallery$/i })).not.toBeInTheDocument();
  });

  it('returns to the sheet from Work', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /^about$/i }));
    await user.click(screen.getByRole('button', { name: /^work$/i }));
    expect(screen.getByRole('button', { name: /^work$/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText(/I take 35mm and medium format film photography/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open photo/i })).toBeInTheDocument();
  });

  it('returns to the sheet from the wordmark', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /^about$/i }));
    await user.click(screen.getByRole('button', { name: 'adubsqz' }));
    expect(screen.getByRole('button', { name: /^work$/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText(/I take 35mm and medium format film photography/i)).not.toBeInTheDocument();
  });

  it('opens contact modal from About', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /^about$/i }));
    await user.click(await screen.findByRole('button', { name: /let's talk/i }));
    expect(await screen.findByRole('dialog', { name: /contact/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('keeps rights copy on About only once and restores the gallery footer', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByText(/rights reserved/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^about$/i }));
    expect(await screen.findByText(/AWS Certified AI Practitioner/i)).toBeInTheDocument();
    expect(screen.getAllByText(/rights reserved/i)).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: /^work$/i }));
    expect(screen.getByText(/rights reserved/i)).toBeInTheDocument();
  });

  it('closes contact modal when Close is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /^about$/i }));
    await user.click(await screen.findByRole('button', { name: /let's talk/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
