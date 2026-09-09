import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AboutView from './AboutView';

describe('AboutView', () => {
  it('renders the human voice, portfolio pitch, contact CTA, and rights block', () => {
    render(<AboutView />);
    expect(screen.getByText(/I am not an AI robot/i)).toBeInTheDocument();
    expect(screen.getByText(/Let's talk, like humans do/i)).toBeInTheDocument();
    expect(
      screen.getByText(/I design and build lightweight portfolio sites for photographers/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Need prints, a license, or a site/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /let's talk/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /let's talk/i }).querySelector('.graffiti-label--on')).toHaveAttribute(
      'data-tone',
      'pink',
    );
    expect(screen.getByText(/rights reserved/i)).toBeInTheDocument();
    expect(screen.getByText(/copyright © 2026 Alexander Ames/i)).toBeInTheDocument();
    expect(screen.queryByAltText(/portrait/i)).not.toBeInTheDocument();
    const instagram = screen.getByRole('link', { name: /^instagram$/i });
    expect(instagram).toHaveAttribute('href', 'https://www.instagram.com/adubsqz/');
    expect(instagram).toHaveAttribute('target', '_blank');
    expect(screen.getAllByRole('link', { name: 'adubsqz.github.io' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByRole('link', { name: /^github$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^linkedin$/i })).not.toBeInTheDocument();
  });

  it('invokes onContactClick from Let\'s talk', async () => {
    const onContactClick = vi.fn();
    const user = userEvent.setup();
    render(<AboutView onContactClick={onContactClick} />);
    await user.click(screen.getByRole('button', { name: /let's talk/i }));
    expect(onContactClick).toHaveBeenCalledTimes(1);
  });
});
