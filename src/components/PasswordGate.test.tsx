import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PasswordGate from './PasswordGate';
import {
  clearStoredGalleryJwt,
  GALLERY_JWT_STORAGE_KEY,
  GALLERY_JWT_TTL_MS,
  mintGalleryJwt,
  writeStoredGalleryJwt,
} from '../galleryJwt';
import { FORMSUBMIT_FORM_ID } from '../inquireStatic';
import { INSTAGRAM_URL } from '../site';

describe('PasswordGate', () => {
  beforeEach(() => {
    clearStoredGalleryJwt();
    window.localStorage.clear();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    clearStoredGalleryJwt();
    window.localStorage.clear();
  });

  it('links Instagram DMs for the password and never prints sqz', async () => {
    render(
      <PasswordGate>
        <p>gallery</p>
      </PasswordGate>,
    );

    const dm = await screen.findByRole('link', {
      name: 'Need the lookbook password? DM @adubsqz.',
    });
    expect(INSTAGRAM_URL).toBe('https://www.instagram.com/adubsqz/');
    expect(dm).toHaveAttribute('href', INSTAGRAM_URL);
    expect(dm).toHaveAttribute('target', '_blank');
    expect(dm).toHaveAttribute('rel', 'noopener noreferrer');
    expect(document.body.textContent ?? '').not.toMatch(/(^|[^a-z0-9])sqz([^a-z0-9]|$)/i);
  });

  it('asks for the password until sqz mints a JWT', async () => {
    const user = userEvent.setup();
    render(
      <PasswordGate>
        <p>gallery</p>
      </PasswordGate>,
    );

    const field = await screen.findByLabelText(/password/i);
    expect(field).toHaveAttribute('autoCapitalize', 'none');
    expect(screen.queryByText('gallery')).not.toBeInTheDocument();
    await user.type(field, 'nope');
    await user.click(screen.getByRole('button', { name: /enter/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/incorrect password/i);
    expect(screen.queryByText('gallery')).not.toBeInTheDocument();
    expect(window.localStorage.getItem(GALLERY_JWT_STORAGE_KEY)).toBeNull();
    expect(document.body.textContent ?? '').not.toMatch(/(^|[^a-z0-9])sqz([^a-z0-9]|$)/i);

    await user.clear(field);
    await user.type(field, 'Sqz ');
    await user.click(screen.getByRole('button', { name: /enter/i }));
    expect(await screen.findByText('gallery')).toBeInTheDocument();
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
    expect(window.localStorage.getItem(GALLERY_JWT_STORAGE_KEY)).toBeTruthy();
  });

  it('lets visitors request access from the gate without unlocking', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('VITE_WEB3FORMS_ACCESS_KEY', '');

    render(
      <PasswordGate>
        <p>gallery</p>
      </PasswordGate>,
    );

    await screen.findByLabelText(/password/i);
    await user.click(screen.getByRole('button', { name: /request key/i }));
    await user.type(screen.getByLabelText(/^name$/i), 'Pat');
    await user.type(screen.getByLabelText(/^email$/i), 'pat@example.com');
    await user.type(screen.getByLabelText(/what do you need/i), 'Need lookbook access');
    await user.click(screen.getByRole('button', { name: /send request/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(/check pat@example.com/i);
    expect(fetchMock).toHaveBeenCalledWith(
      `https://formsubmit.co/ajax/${FORMSUBMIT_FORM_ID}`,
      expect.objectContaining({ method: 'POST' }),
    );
    expect(screen.queryByText('gallery')).not.toBeInTheDocument();
    expect(document.body.textContent ?? '').not.toMatch(/(^|[^a-z0-9])sqz([^a-z0-9]|$)/i);
  });

  it('lets a still-valid stored JWT through', async () => {
    const token = await mintGalleryJwt('sqz');
    writeStoredGalleryJwt(token!);
    render(
      <PasswordGate>
        <p>gallery</p>
      </PasswordGate>,
    );
    expect(await screen.findByText('gallery')).toBeInTheDocument();
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
  });

  it('shows the gate again after the JWT expires', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-09T12:00:00.000Z'));
    const token = await mintGalleryJwt('sqz');
    writeStoredGalleryJwt(token!);
    vi.setSystemTime(new Date(Date.now() + GALLERY_JWT_TTL_MS + 1000));
    render(
      <PasswordGate>
        <p>gallery</p>
      </PasswordGate>,
    );
    expect(await screen.findByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.queryByText('gallery')).not.toBeInTheDocument();
  });

  it('relocks 1ms after TTL and drops the stored JWT', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-09T12:00:00.000Z'));
    const token = await mintGalleryJwt('sqz');
    writeStoredGalleryJwt(token!);
    vi.setSystemTime(new Date(Date.now() + GALLERY_JWT_TTL_MS + 1));
    render(
      <PasswordGate>
        <p>gallery</p>
      </PasswordGate>,
    );
    expect(await screen.findByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.queryByText('gallery')).not.toBeInTheDocument();
    expect(window.localStorage.getItem('adubsqz.gallery.jwt')).toBeNull();
  });

  it('does not honor a session stored under the previous key', async () => {
    const token = await mintGalleryJwt('sqz');
    window.localStorage.setItem('adubsqz.gallery.jwt', token!);
    render(
      <PasswordGate>
        <p>gallery</p>
      </PasswordGate>,
    );
    expect(await screen.findByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.queryByText('gallery')).not.toBeInTheDocument();
  });

  it('skips the gate when VITE_E2E=1', () => {
    vi.stubEnv('VITE_E2E', '1');
    render(
      <PasswordGate>
        <p>gallery</p>
      </PasswordGate>,
    );
    expect(screen.getByText('gallery')).toBeInTheDocument();
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
  });

  it('still shows the gate when VITE_E2E is not exactly 1', async () => {
    vi.stubEnv('VITE_E2E', 'true');
    render(
      <PasswordGate>
        <p>gallery</p>
      </PasswordGate>,
    );
    expect(await screen.findByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.queryByText('gallery')).not.toBeInTheDocument();
  });
});
