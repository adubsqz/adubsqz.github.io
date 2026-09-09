import { useEffect, useState } from 'react';
import BrandMark from './BrandMark';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  clearStoredGalleryJwt,
  galleryGateBypassed,
  hasValidGallerySession,
  mintGalleryJwt,
  writeStoredGalleryJwt,
} from '../galleryJwt';

interface PasswordGateProps {
  children: React.ReactNode;
}

/**
 * GitHub Pages cannot mint HttpOnly cookies. Visitors type `sqz`, receive a
 * 15-minute HS256 JWT in localStorage, and re-enter when it expires. No refresh.
 * `VITE_E2E=1` skips the gate for Playwright.
 */
export default function PasswordGate({ children }: PasswordGateProps) {
  const bypass = galleryGateBypassed();
  const [ready, setReady] = useState(bypass);
  const [unlocked, setUnlocked] = useState(bypass);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (bypass) return;
    let cancelled = false;
    void hasValidGallerySession().then((ok) => {
      if (cancelled) return;
      setUnlocked(ok);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [bypass]);

  useEffect(() => {
    if (bypass || !unlocked) return;
    const tick = () => {
      void hasValidGallerySession().then((ok) => {
        if (!ok) {
          clearStoredGalleryJwt();
          setUnlocked(false);
        }
      });
    };
    const id = window.setInterval(tick, 15_000);
    window.addEventListener('focus', tick);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', tick);
    };
  }, [bypass, unlocked]);

  if (bypass || (ready && unlocked)) {
    return <>{children}</>;
  }

  if (!ready) {
    return <p className="sr-only">Checking access</p>;
  }

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const token = await mintGalleryJwt(password);
      if (!token) {
        setError('Incorrect password.');
        return;
      }
      writeStoredGalleryJwt(token);
      setPassword('');
      setUnlocked(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] font-sans text-photo-fg antialiased">
      <div className="cinematic-grid" aria-hidden />
      <form
        onSubmit={(event) => {
          void onSubmit(event);
        }}
        className="relative z-[1] mx-auto flex min-h-[100dvh] max-w-sm flex-col justify-center gap-5 px-4"
      >
        <BrandMark />
        <div>
          <label htmlFor="gallery-password" className="mb-1.5 block text-sm text-photo-muted">
            Password
          </label>
          <Input
            id="gallery-password"
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>
        {error ? (
          <p className="text-sm text-mcm-brick" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="h-12 text-base" disabled={submitting}>
          Enter
        </Button>
      </form>
    </div>
  );
}
