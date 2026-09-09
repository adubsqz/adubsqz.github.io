import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InquiryModal from './InquiryModal';
import type { Photo } from '../types';
import { ABOUT } from '../data';
import * as inquireStatic from '../inquireStatic';

describe('InquiryModal (unit)', () => {
  const onClose = vi.fn();
  const photo: Photo = { id: 'bw-1', src: '/photos/still-life/bw/000230040034.jpg', alt: 'Still life 1' };

  beforeEach(() => {
    onClose.mockClear();
    const location = window.location;
    delete (window as unknown as { location?: Location }).location;
    (window as unknown as { location: Location }).location = {
      ...location,
      href: '',
    } as Location;
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders the inquiry form dialog', () => {
    render(<InquiryModal photo={photo} onClose={onClose} />);
    expect(screen.getByRole('dialog', { name: /request invoice/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/shipping address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/print size/i)).toBeInTheDocument();
    const printSize = screen.getByLabelText(/print size/i);
    expect(printSize).toHaveDisplayValue(/16″ × 20″/);
    expect(printSize).toContainHTML('locket');
    expect(printSize).toContainHTML('house');
    expect(screen.getByRole('button', { name: /submit inquiry/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('shows the custom size input when selecting "custom"', async () => {
    const user = userEvent.setup();
    render(<InquiryModal photo={photo} onClose={onClose} />);

    const printSizeSelect = screen.getByLabelText(/print size/i);
    await user.selectOptions(printSizeSelect, 'custom');

    expect(screen.getByLabelText(/custom dimensions/i)).toBeInTheDocument();
  });

  it('submits via mailto and shows success, then calls onClose after 2s', async () => {
    const realSetTimeout = globalThis.setTimeout;
    const setTimeoutSpy = vi
      .spyOn(globalThis, 'setTimeout')
      .mockImplementation((cb, ms?: number, ...args: unknown[]) => {
        if (ms === 2000) {
          if (typeof cb === 'function') (cb as () => void)();
          return 0 as unknown as ReturnType<typeof setTimeout>;
        }
        return realSetTimeout(cb as Parameters<typeof setTimeout>[0], ms as number, ...args);
      });

    try {
      const user = userEvent.setup();
      render(<InquiryModal photo={photo} onClose={onClose} />);

      await user.type(screen.getByLabelText(/full name/i), 'Jane Doe');
      await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
      await user.type(screen.getByLabelText(/shipping address/i), '123 Main St\nNew York, NY 10001');

      fireEvent.click(screen.getByRole('button', { name: /submit inquiry/i }));

      await act(async () => {
        await Promise.resolve();
      });

      expect(window.location.href).toContain('mailto:adubsqz@gmail.com');
      expect(window.location.href).toContain(ABOUT.contactEmail);
      expect(window.location.href).toContain(encodeURIComponent(photo.id));
      expect(screen.getByText(/inquiry submitted/i)).toBeInTheDocument();
      expect(onClose).toHaveBeenCalledTimes(1);
    } finally {
      setTimeoutSpy.mockRestore();
    }
  });

  it('maps custom print size into the mailto body', async () => {
    const user = userEvent.setup();
    render(<InquiryModal photo={photo} onClose={onClose} />);

    await user.selectOptions(screen.getByLabelText(/print size/i), 'custom');
    await user.type(screen.getByLabelText(/custom dimensions/i), '30x40 inches');
    await user.type(screen.getByLabelText(/full name/i), 'Jane Doe');
    await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
    await user.type(screen.getByLabelText(/shipping address/i), '123 Main St\nNew York, NY 10001');
    await user.selectOptions(screen.getByLabelText(/print medium/i), 'canvas');
    await user.selectOptions(screen.getByLabelText(/^finish$/i), 'gloss');
    await user.type(screen.getByLabelText(/additional notes/i), 'frame it');

    await user.click(screen.getByRole('button', { name: /submit inquiry/i }));

    expect(window.location.href).toContain(encodeURIComponent('30x40 inches'));
  });

  it('maps house print size into the mailto body', async () => {
    const user = userEvent.setup();
    render(<InquiryModal photo={photo} onClose={onClose} />);

    await user.selectOptions(screen.getByLabelText(/print size/i), 'house 8x10 ft');
    await user.type(screen.getByLabelText(/full name/i), 'Jane Doe');
    await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
    await user.type(screen.getByLabelText(/shipping address/i), '123 Main St\nNew York, NY 10001');

    await user.click(screen.getByRole('button', { name: /submit inquiry/i }));

    expect(window.location.href).toContain(encodeURIComponent('house 8x10 ft'));
  });

  it('shows an error when submitPrintInquiry throws', async () => {
    vi.spyOn(inquireStatic, 'submitPrintInquiry').mockRejectedValueOnce(new Error('nope'));
    const user = userEvent.setup();
    render(<InquiryModal photo={photo} onClose={onClose} />);
    await user.type(screen.getByLabelText(/full name/i), 'Jane Doe');
    await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
    await user.type(screen.getByLabelText(/shipping address/i), '123 Main St');
    await user.click(screen.getByRole('button', { name: /submit inquiry/i }));
    expect(await screen.findByText(/nope/i)).toBeInTheDocument();
  });

  it('calls onClose from cancel', async () => {
    const user = userEvent.setup();
    render(<InquiryModal photo={photo} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
