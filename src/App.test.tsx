import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

describe('App', () => {
  it('renders navigation with Gallery and About me tabs', () => {
    render(<App />);
    expect(screen.getByRole('tab', { name: /^gallery$/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /about me/i })).toBeInTheDocument();
  });

  it('shows Gallery view by default', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /greyscale/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /full spectrum/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /redscale/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^people$/i })).toBeInTheDocument();
  });

  it('switches to About view when About me tab is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('tab', { name: /about me/i }));
    const aboutPanel = screen.getByRole('tabpanel');
    expect(await within(aboutPanel).findByText(/I am not an AI robot/i)).toBeInTheDocument();
    expect(
      within(aboutPanel).getByText(/lightweight portfolio sites for photographers/i),
    ).toBeInTheDocument();
    expect(within(aboutPanel).getByRole('button', { name: /let's talk/i })).toBeInTheDocument();
    expect(within(aboutPanel).queryByText(/Originally from the Southwest/i)).not.toBeInTheDocument();
  });

  it('switches back to Gallery when Gallery tab is clicked after viewing About', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('tab', { name: /about me/i }));
    await user.click(screen.getByRole('tab', { name: /^gallery$/i }));
  });

  it('opens contact modal when Contact me is clicked from About page', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('tab', { name: /about me/i }));
    await user.click(await screen.findByRole('button', { name: /let's talk/i }));
    expect(await screen.findByRole('dialog', { name: /contact/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('switches gallery collection filters', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /^full spectrum$/i }));
    expect(screen.getByRole('button', { name: /^full spectrum$/i }).className).toMatch(/mcm-rust/);
    await user.click(screen.getByRole('button', { name: /^redscale$/i }));
    expect(screen.getByRole('button', { name: /^redscale$/i }).className).toMatch(/mcm-rust/);
    await user.click(screen.getByRole('button', { name: /^people$/i }));
    expect(screen.getByRole('button', { name: /^people$/i }).className).toMatch(/mcm-rust/);
    expect(screen.getAllByRole('button', { name: /open photo/i }).length).toBeGreaterThan(0);
  });

  it('keeps rights copy on About only once and restores the gallery footer', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByText(/rights reserved/i)).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /about me/i }));
    expect(await screen.findByText(/lightweight portfolio sites/i)).toBeInTheDocument();
    expect(screen.getAllByText(/rights reserved/i)).toHaveLength(1);
    await user.click(screen.getByRole('tab', { name: /^gallery$/i }));
    expect(screen.getByText(/rights reserved/i)).toBeInTheDocument();
  });

  it('closes contact modal when Close is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('tab', { name: /about me/i }));
    await user.click(await screen.findByRole('button', { name: /let's talk/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
