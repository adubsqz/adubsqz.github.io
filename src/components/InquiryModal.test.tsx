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
    expect(printSize).toHaveDisplayValue(/8″ × 10″/);
    expect(printSize).toContainHTML('locket');
    expect(printSize).not.toContainHTML('house');
    expect(printSize).not.toContainHTML('40″');
    expect(printSize).not.toContainHTML('16″ × 20″');
    expect(printSize).toContainHTML('custom');
    expect(screen.getByText(/inquire via email for more sizing options/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit inquiry/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.queryByText(/stripe/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/checkout/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/shopify/i)).not.toBeInTheDocument();
  });

  it('hides 16×20 when only one master dimension is set', () => {
    const { rerender } = render(
      <InquiryModal photo={{ ...photo, masterWidth: 8000 }} onClose={onClose} />,
    );
    let printSize = screen.getByLabelText(/print size/i);
    expect(printSize).not.toContainHTML('16″ × 20″');
    expect(printSize).toContainHTML('custom');
    expect(printSize).toHaveDisplayValue(/8″ × 10″/);

    rerender(<InquiryModal photo={{ ...photo, masterHeight: 8000 }} onClose={onClose} />);
    printSize = screen.getByLabelText(/print size/i);
    expect(printSize).not.toContainHTML('16″ × 20″');
    expect(printSize).toContainHTML('custom');
  });

  it('points unmatched stills to email for more sizes', () => {
    render(<InquiryModal photo={{ ...photo, masterWidth: 8000 }} onClose={onClose} />);
    expect(screen.getByText(/inquire via email for more sizing options/i)).toBeInTheDocument();
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

  it('offers house and 40×60 only when master pixels are huge', () => {
    render(
      <InquiryModal
        photo={{ ...photo, masterWidth: 18000, masterHeight: 14400 }}
        onClose={onClose}
      />,
    );
    const printSize = screen.getByLabelText(/print size/i);
    expect(printSize).toContainHTML('house');
    expect(printSize).toContainHTML('40″');
    expect(printSize).toHaveDisplayValue(/40″ × 60″/);
    expect(screen.queryByText(/inquire via email for more sizing options/i)).not.toBeInTheDocument();
  });

  it('maps house print size into the mailto body', async () => {
    const user = userEvent.setup();
    render(
      <InquiryModal
        photo={{ ...photo, masterWidth: 18000, masterHeight: 14400 }}
        onClose={onClose}
      />,
    );

    await user.selectOptions(screen.getByLabelText(/print size/i), 'house 8x10 ft');
    await user.type(screen.getByLabelText(/full name/i), 'Jane Doe');
    await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
    await user.type(screen.getByLabelText(/shipping address/i), '123 Main St\nNew York, NY 10001');

    await user.click(screen.getByRole('button', { name: /submit inquiry/i }));

    expect(window.location.href).toContain(encodeURIComponent('house 8x10 ft'));
  });

  it('submits through submitPrintInquiry (FormSubmit path), never Stripe', async () => {
    const submitSpy = vi.spyOn(inquireStatic, 'submitPrintInquiry').mockResolvedValueOnce();
    const user = userEvent.setup();
    render(<InquiryModal photo={photo} onClose={onClose} />);
    await user.type(screen.getByLabelText(/full name/i), 'Jane Doe');
    await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
    await user.type(screen.getByLabelText(/shipping address/i), '123 Main St');
    await user.click(screen.getByRole('button', { name: /submit inquiry/i }));
    expect(submitSpy).toHaveBeenCalledTimes(1);
    expect(submitSpy.mock.calls[0]?.[0]).toMatchObject({
      name: 'Jane Doe',
      email: 'jane@example.com',
      photo: expect.objectContaining({ id: photo.id }),
    });
    expect(screen.queryByText(/stripe/i)).not.toBeInTheDocument();
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
