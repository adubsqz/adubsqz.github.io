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

describe('Lightbox contact flow (functional)', () => {
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
    'opens Contact Me from a lightbox and submits via mailto:adubsqz@gmail.com',
    async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    const prefill = contactPrefillForPhoto(fixturePhoto);

    const clickTarget = container.querySelector('.absolute.inset-0.z-10');
    if (!clickTarget) throw new Error('Photo click target not found');

    await user.click(clickTarget);
    const lightbox = await screen.findByRole('dialog', { name: /image lightbox/i });
    expect(lightbox).toBeInTheDocument();
    expect(within(lightbox).queryByRole('button', { name: /request invoice/i })).not.toBeInTheDocument();
    expect(within(lightbox).queryByText(/tearsheet/i)).not.toBeInTheDocument();

    await user.click(within(lightbox).getByRole('button', { name: /contact me/i }));

    const contact = await screen.findByRole('dialog', { name: /contact/i });
    expect(contact).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: /request invoice/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/shipping address/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/subject/i)).toHaveValue(prefill.subject);
    expect(screen.getByLabelText(/message/i)).toHaveValue(prefill.message);
    expect(prefill.subject).toContain(fixturePhoto.alt);
    expect(prefill.message).toContain(fixturePhoto.id);

    await user.type(screen.getByLabelText(/name/i), 'Jane Doe');
    await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
    await user.click(screen.getByRole('button', { name: /send/i }));

    expect(window.location.href).toContain('mailto:adubsqz@gmail.com');
    expect(window.location.href).toContain(encodeURIComponent(prefill.subject));
    expect(await screen.findByText(/message sent/i)).toBeInTheDocument();
  });

  it('posts lightbox Contact Me to FormSubmit at adubsqz@gmail.com when fetch succeeds', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    const { container } = render(<App />);
    const prefill = contactPrefillForPhoto(fixturePhoto);

    const clickTarget = container.querySelector('.absolute.inset-0.z-10');
    if (!clickTarget) throw new Error('Photo click target not found');

    await user.click(clickTarget);
    const lightbox = await screen.findByRole('dialog', { name: /image lightbox/i });
    await user.click(within(lightbox).getByRole('button', { name: /contact me/i }));

    await user.type(screen.getByLabelText(/name/i), 'Jane Doe');
    await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
    await user.click(screen.getByRole('button', { name: /send/i }));

    expect(fetchMock).toHaveBeenCalledWith(
      `https://formsubmit.co/ajax/${FORMSUBMIT_FORM_ID}`,
      expect.objectContaining({ method: 'POST' }),
    );
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body._subject).toContain(prefill.subject);
    expect(body.message).toContain(fixturePhoto.id);
    expect(window.location.href).not.toMatch(/^mailto:/);
    expect(await screen.findByText(/message sent/i)).toBeInTheDocument();
  });
});
