import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BrandMark from './BrandMark';

describe('BrandMark', () => {
  it('exposes a plain wordmark named adubsqz', () => {
    render(<BrandMark />);
    const mark = screen.getByRole('heading', { name: 'adubsqz' });
    expect(mark).toHaveClass('brand-mark');
    expect(mark.querySelector('.graffiti-label')).toBeNull();
  });

  it('returns home when the wordmark is clicked', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<BrandMark onClick={onClick} />);
    await user.click(screen.getByRole('button', { name: 'adubsqz' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
