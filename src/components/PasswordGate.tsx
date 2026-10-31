import { useEffect, useState } from 'react';
import BrandMark from './BrandMark';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { GATE_PREVIEW_SRCS } from '../data';
import { unlockEdgePhotoGate } from '../edgeGate';
import {
  clearStoredGalleryJwt,
  galleryGateBypassed,
  hasValidGallerySession,
  mintGalleryJwt,
  readStoredGalleryJwt,
  writeStoredGalleryJwt,
} from '../galleryJwt';
import { INSTAGRAM_URL } from '../site';

interface PasswordGateProps {
  children: React.ReactNode;
}

/**
 * GitHub Pages cannot mint HttpOnly cookies. Visitors type the lookbook
 * password, receive a 30-day HS256 JWT in localStorage, and re-enter when it
 * expires. No refresh. Do not print the password in the UI.
 * When `VITE_EDGE_PHOTO_GATE=1`, also POSTs to `/api/gate-unlock` for the
 * Worker cookie (see hosting/AUTOMATION.md). `VITE_E2E=1` skips for Playwright.
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
    void hasValidGallerySession().then(async (ok) => {
      if (cancelled) return;
      if (ok) {
        // Session restore has no password — mint edge cookie via lookbook JWT.
        const jwt = readStoredGalleryJwt();
        if (jwt) await unlockEdgePhotoGate({ jwt });
      }
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
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-mcm-ink font-sans text-mcm-cream antialiased">
        <p className="text-sm tracking-wide text-mcm-cream/80" role="status">
          Opening lookbook…
        </p>
      </div>
    );
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
      await unlockEdgePhotoGate({ password, jwt: token });
      setPassword('');
      setUnlocked(true);
    } catch {
      setError('Could not check the password. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const previews = GATE_PREVIEW_SRCS.length > 0 ? GATE_PREVIEW_SRCS : [];

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-mcm-ink font-sans text-mcm-cream antialiased">
      {previews.length > 0 ? (
        <div
          className="pointer-events-none absolute inset-0 grid grid-cols-2 gap-1 opacity-45 sm:grid-cols-4 sm:opacity-50"
          aria-hidden="true"
        >
          {previews.map((src) => (
            <div key={src} className="relative min-h-[50dvh] overflow-hidden bg-mcm-ink sm:min-h-[100dvh]">
              <img
                src={src}
                alt=""
                className="h-full w-full object-cover"
                loading="eager"
                decoding="async"
                draggable={false}
              />
            </div>
          ))}
        </div>
      ) : null}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-mcm-ink/55 via-mcm-ink/72 to-mcm-ink/88"
        aria-hidden="true"
      />

      <form
        onSubmit={(event) => {
          void onSubmit(event);
        }}
        className="relative z-[1] mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center gap-6 px-5 py-10 animate-fade-up"
      >
        <div className="space-y-3 text-center sm:text-left">
          <BrandMark size="hero" />
          <p className="text-base leading-snug text-mcm-cream/85 sm:text-lg">
            35mm and medium-format stills. Password opens the lookbook.
          </p>
        </div>
        <div>
          <label htmlFor="gallery-password" className="mb-1.5 block text-sm text-mcm-cream/75">
            Password
          </label>
          <Input
            id="gallery-password"
            type="password"
            name="password"
            autoComplete="current-password"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            className="min-h-12 border-mcm-cream/25 bg-mcm-ink/40 text-base text-mcm-cream placeholder:text-mcm-cream/40"
          />
        </div>
        {error ? (
          <p className="text-sm text-mcm-rust" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="h-12 text-base" disabled={submitting}>
          {submitting ? 'Checking…' : 'Enter lookbook'}
        </Button>
        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-center text-sm text-mcm-cream/70 underline-offset-4 hover:text-mcm-cream hover:underline sm:text-left"
        >
          Need the lookbook password? DM @adubsqz.
        </a>
      </form>
    </div>
  );
}
