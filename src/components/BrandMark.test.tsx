import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BrandMark from './BrandMark';

describe('BrandMark', () => {
  it('exposes a colored graffiti wordmark named adubsqz', () => {
    render(<BrandMark />);
    const mark = screen.getByRole('heading', { name: 'adubsqz' });
    expect(mark).toHaveClass('brand-mark');
    expect(mark.querySelector('.graffiti-label--on')).toHaveAttribute('data-tone', 'pink');
  });

  it('opens About when the wordmark is clicked', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<BrandMark onClick={onClick} pressed={false} />);
    await user.click(screen.getByRole('button', { name: 'adubsqz' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('marks the wordmark pressed while About is open', () => {
    render(<BrandMark onClick={() => undefined} pressed />);
    expect(screen.getByRole('button', { name: 'adubsqz' })).toHaveAttribute('aria-pressed', 'true');
  });
});
