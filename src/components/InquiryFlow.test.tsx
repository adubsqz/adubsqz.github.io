import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../data', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../data')>();
  const fixture = {
    id: 'fixture-1',
    src: '/photos/still-life/bw/fixture-inquiry.jpg',
    alt: 'Photograph fixture_inquiry',
    caption: '',
  };
  return {
    ...actual,
    COLLECTIONS: [
      { ...actual.COLLECTIONS[0], photos: [fixture] },
      { ...actual.COLLECTIONS[1], photos: [] },
    ],
  };
});

import App from '../App';
import { contactPrefillForPhoto, FORMSUBMIT_FORM_ID } from '../inquireStatic';

const fixturePhoto = {
  id: 'fixture-1',
  alt: 'Photograph fixture_inquiry',
};

describe('Lightbox invoice flow (functional)', () => {
  beforeEach(() => {
    const location = window.location;
    delete (window as unknown as { location?: Location }).location;
    (window as unknown as { location: Location }).location = {
      ...location,
      href: '',
    } as Location;
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it(
    'opens Request Invoice from a lightbox and submits via mailto:adubsqz@gmail.com',
    async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    const clickTarget = container.querySelector('.absolute.inset-0.z-10');
    if (!clickTarget) throw new Error('Photo click target not found');

    await user.click(clickTarget);
    const lightbox = await screen.findByRole('dialog', { name: /image lightbox/i });
    expect(lightbox).toBeInTheDocument();
    expect(within(lightbox).getByRole('button', { name: /request invoice/i })).toBeInTheDocument();
    expect(within(lightbox).queryByText(/tearsheet/i)).not.toBeInTheDocument();

    await user.click(within(lightbox).getByRole('button', { name: /request invoice/i }));

    const invoice = await screen.findByRole('dialog', { name: /request invoice/i });
    expect(invoice).toBeInTheDocument();
    expect(screen.getByLabelText(/shipping address/i)).toBeInTheDocument();
    const printSize = screen.getByLabelText(/print size/i);
    expect(printSize).toBeInTheDocument();
    expect(printSize).toHaveDisplayValue(/8″ × 10″/);
    expect(printSize).not.toContainHTML('16″ × 20″');
    expect(printSize).toContainHTML('custom');

    await user.type(screen.getByLabelText(/full name/i), 'Jane Doe');
    await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
    await user.type(screen.getByLabelText(/shipping address/i), '123 Main St\nNew York, NY 10001');
    await user.click(screen.getByRole('button', { name: /submit inquiry/i }));

    expect(window.location.href).toContain('mailto:adubsqz@gmail.com');
    expect(window.location.href).toContain(encodeURIComponent(fixturePhoto.id));
    expect(window.location.href).not.toMatch(/stripe/i);
    expect(screen.queryByText(/stripe/i)).not.toBeInTheDocument();
    expect(await screen.findByText(/inquiry submitted/i)).toBeInTheDocument();
  });

  it('posts lightbox Request Invoice to FormSubmit when fetch succeeds', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    const { container } = render(<App />);

    const clickTarget = container.querySelector('.absolute.inset-0.z-10');
    if (!clickTarget) throw new Error('Photo click target not found');

    await user.click(clickTarget);
    const lightbox = await screen.findByRole('dialog', { name: /image lightbox/i });
    await user.click(within(lightbox).getByRole('button', { name: /request invoice/i }));

    await user.type(screen.getByLabelText(/full name/i), 'Jane Doe');
    await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
    await user.type(screen.getByLabelText(/shipping address/i), '123 Main St');
    await user.click(screen.getByRole('button', { name: /submit inquiry/i }));

    expect(fetchMock).toHaveBeenCalledWith(
      `https://formsubmit.co/ajax/${FORMSUBMIT_FORM_ID}`,
      expect.objectContaining({ method: 'POST' }),
    );
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body._subject).toMatch(/print inquiry/i);
    expect(body.message).toContain(fixturePhoto.id);
    expect(JSON.stringify(fetchMock.mock.calls)).not.toMatch(/stripe/i);
    expect(window.location.href).not.toMatch(/^mailto:/);
    expect(window.location.href).not.toMatch(/stripe/i);
    expect(await screen.findByText(/inquiry submitted/i)).toBeInTheDocument();
  });

  it('opens Contact from Licensing or hire with photo prefill', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    const prefill = contactPrefillForPhoto(fixturePhoto);

    const clickTarget = container.querySelector('.absolute.inset-0.z-10');
    if (!clickTarget) throw new Error('Photo click target not found');

    await user.click(clickTarget);
    const lightbox = await screen.findByRole('dialog', { name: /image lightbox/i });
    await user.click(within(lightbox).getByRole('button', { name: /licensing or hire/i }));

    const contact = await screen.findByRole('dialog', { name: /contact/i });
    expect(contact).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: /request invoice/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/shipping address/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/subject/i)).toHaveValue(prefill.subject);
    expect(screen.getByLabelText(/message/i)).toHaveValue(prefill.message);
  });
});
