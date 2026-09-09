import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PasswordGate from './PasswordGate';
import { GALLERY_JWT_TTL_MS, mintGalleryJwt, writeStoredGalleryJwt } from '../galleryJwt';

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
});
