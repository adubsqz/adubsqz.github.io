import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../data', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../data')>();
  return {
    ...actual,
    COLLECTIONS: [
      { ...actual.COLLECTIONS[0], photos: actual.COLLECTIONS[0]?.photos.slice(0, 1) ?? [] },
      { ...actual.COLLECTIONS[1], photos: [] },
    ],
  };
});

import App from '../App';
import { ABOUT } from '../data';
import { FORMSUBMIT_FORM_ID } from '../inquireStatic';

describe('Contact me flow (functional)', () => {
  beforeEach(() => {
    const location = window.location;
    delete (window as unknown as { location?: Location }).location;
    (window as unknown as { location: Location }).location = {
      ...location,
      href: '',
    } as Location;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('submits contact via mailto:adubsqz@gmail.com when FormSubmit fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'adubsqz' }));
    await user.click(await screen.findByRole('button', { name: /let's talk/i }));

    expect(await screen.findByRole('dialog', { name: /contact/i })).toBeInTheDocument();

    await user.type(screen.getByLabelText(/name/i), 'Jane');
    await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
    await user.type(screen.getByLabelText(/subject/i), 'Hello');
    await user.type(screen.getByLabelText(/message/i), 'Hi there');

    await user.click(screen.getByRole('button', { name: /send/i }));

    expect(window.location.href).toContain('mailto:adubsqz@gmail.com');
    expect(window.location.href).toContain(ABOUT.contactEmail ?? '');
    expect(window.location.href).toContain('subject=');
    expect(window.location.href).toContain(encodeURIComponent('Hello'));
    expect(window.location.href).toContain(encodeURIComponent('Jane'));
    expect(window.location.href).toContain(encodeURIComponent('jane@example.com'));
    expect(window.location.href).toContain(encodeURIComponent('Hi there'));

    expect(await screen.findByText(/message sent/i)).toBeInTheDocument();
  });

  it('posts CONTACT ME to the activated FormSubmit hash when fetch succeeds', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'adubsqz' }));
    await user.click(await screen.findByRole('button', { name: /let's talk/i }));
    await user.type(screen.getByLabelText(/name/i), 'Jane');
    await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
    await user.type(screen.getByLabelText(/subject/i), 'Hello');
    await user.type(screen.getByLabelText(/message/i), 'Hi there');
    await user.click(screen.getByRole('button', { name: /send/i }));

    expect(fetchMock).toHaveBeenCalledWith(
      `https://formsubmit.co/ajax/${FORMSUBMIT_FORM_ID}`,
      expect.objectContaining({ method: 'POST' }),
    );
    expect(window.location.href).not.toMatch(/^mailto:/);
    expect(await screen.findByText(/message sent/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^close$/i }));
    expect(screen.queryByText(/message sent/i)).not.toBeInTheDocument();
  });
});
