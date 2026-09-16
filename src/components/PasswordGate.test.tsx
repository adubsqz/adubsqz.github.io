import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PasswordGate from './PasswordGate';
import { GALLERY_JWT_TTL_MS, mintGalleryJwt, writeStoredGalleryJwt } from '../galleryJwt';
import { INSTAGRAM_URL } from '../site';

describe('PasswordGate', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
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
    expect(screen.queryByText('gallery')).not.toBeInTheDocument();
    await user.type(field, 'nope');
    await user.click(screen.getByRole('button', { name: /enter/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/incorrect password/i);
    expect(screen.queryByText('gallery')).not.toBeInTheDocument();
    expect(window.localStorage.getItem('adubsqz.gallery.jwt')).toBeNull();
    expect(document.body.textContent ?? '').not.toMatch(/(^|[^a-z0-9])sqz([^a-z0-9]|$)/i);

    await user.clear(field);
    await user.type(field, 'sqz');
    await user.click(screen.getByRole('button', { name: /enter/i }));
    expect(await screen.findByText('gallery')).toBeInTheDocument();
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
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
