import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MakersSpaceView from './MakersSpaceView';

describe('MakersSpaceView', () => {
  it('renders seven seats on grain paper without tarot role labels', () => {
    render(<MakersSpaceView now={new Date('2026-11-04T18:00:00-07:00')} />);
    expect(screen.getByTestId('makers-space')).toHaveAttribute('data-ground', 'grain-paper');
    expect(screen.getAllByTestId('makers-seat')).toHaveLength(7);
    expect(screen.queryByText(/hidden obstacles|people's attitudes|the advice/i)).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /open photo/i })).toHaveLength(7);
  });

  it('double-watermarks every seat: CSS overlay + drag-shield (JPEG burn-in is gallery-verified)', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <MakersSpaceView now={new Date('2026-11-04T18:00:00-07:00')} />,
    );

    const seatImgs = container.querySelectorAll('.makers-space__img');
    expect(seatImgs).toHaveLength(7);
    for (const img of seatImgs) {
      expect(img).toHaveAttribute('draggable', 'false');
      expect(img).toHaveClass('makers-space__img');
      fireEvent.load(img);
    }
    // Soft CSS diagonal overlay on each seat (burn-in lives in the JPEG bytes).
    expect(screen.getAllByText(/^adubsqz$/i).length).toBeGreaterThanOrEqual(7);
    expect(container.querySelectorAll('.absolute.inset-0.z-10')).toHaveLength(7);

    await user.click(screen.getAllByRole('button', { name: /open photo/i })[0]);
    const lightbox = await screen.findByRole('dialog');
    const lightboxImg = within(lightbox).getByRole('img');
    fireEvent.load(lightboxImg);
    expect(within(lightbox).getAllByText(/^adubsqz$/i).length).toBeGreaterThanOrEqual(1);
    expect(lightboxImg).toHaveAttribute('draggable', 'false');
  });
});
