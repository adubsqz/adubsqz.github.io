import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BrandMark from './BrandMark';

describe('BrandMark', () => {
  it('ships transparent black and white wordmarks and defaults to white on dark ground', () => {
    const { container } = render(<BrandMark />);
    const mark = screen.getByRole('heading', { name: 'adubsqz' });
    expect(mark).toHaveClass('brand-mark');
    expect(mark).not.toHaveClass('brand-mark--on-light');
    expect(mark.querySelector('.graffiti-label')).toBeNull();

    const white = screen.getByRole('img', { name: 'adubsqz' });
    expect(white).toHaveAttribute('src', '/adubsqz_logo_white.png');
    expect(white).toHaveClass('brand-mark__img--white');

    const black = container.querySelector('img.brand-mark__img--black');
    expect(black).toHaveAttribute('src', '/adubsqz_logo_black.png');
    expect(black).toHaveAttribute('alt', '');
  });

  it('uses the black mark on light ground', () => {
    const { container } = render(<BrandMark ground="light" />);
    const mark = screen.getByRole('heading', { name: 'adubsqz' });
    expect(mark).toHaveClass('brand-mark--on-light');
    expect(screen.getByRole('img', { name: 'adubsqz' })).toHaveAttribute(
      'src',
      '/adubsqz_logo_black.png',
    );
    expect(container.querySelector('img.brand-mark__img--white')).toHaveAttribute('alt', '');
  });

  it('returns home when the wordmark is clicked', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<BrandMark onClick={onClick} />);
    await user.click(screen.getByRole('button', { name: 'adubsqz' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
