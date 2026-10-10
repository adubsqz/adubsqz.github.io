import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';
import PasswordGate from './components/PasswordGate';

describe('lookbook password gate', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_E2E', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    window.localStorage.clear();
  });

  it('hides the contact sheet until a password is entered', async () => {
    render(
      <PasswordGate>
        <App />
      </PasswordGate>,
    );

    expect(await screen.findByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enter/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /open photo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /request invoice/i })).not.toBeInTheDocument();
    expect(document.body.textContent ?? '').not.toMatch(/(^|[^a-z0-9])sqz([^a-z0-9]|$)/i);
  });
});
