import { useEffect, useState } from 'react';
import BrandMark from './BrandMark';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import {
  clearStoredGalleryJwt,
  galleryGateBypassed,
  hasValidGallerySession,
  mintGalleryJwt,
  writeStoredGalleryJwt,
} from '../galleryJwt';
import {
  sentConfirmationHint,
  submitLookbookAccessRequest,
  type InquiryResult,
} from '../inquireStatic';
import { INSTAGRAM_URL } from '../site';

interface PasswordGateProps {
  children: React.ReactNode;
}

/**
 * GitHub Pages cannot mint HttpOnly cookies. Visitors type the lookbook
 * password, receive a 30-day HS256 JWT in localStorage, and re-enter when it
 * expires. No refresh. Do not print the password in the UI.
 * `VITE_E2E=1` skips the gate for Playwright.
 */
export default function PasswordGate({ children }: PasswordGateProps) {
  const bypass = galleryGateBypassed();
  const [ready, setReady] = useState(bypass);
  const [unlocked, setUnlocked] = useState(bypass);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [inquireName, setInquireName] = useState('');
  const [inquireEmail, setInquireEmail] = useState('');
  const [inquireMessage, setInquireMessage] = useState('');
  const [inquireSubmitting, setInquireSubmitting] = useState(false);
  const [inquireResult, setInquireResult] = useState<InquiryResult | null>(null);

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
    } catch {
      setError('Could not check the password. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const onInquire = async (event: React.FormEvent) => {
    event.preventDefault();
    setInquireSubmitting(true);
    setInquireResult(null);
    try {
      const result = await submitLookbookAccessRequest({
        name: inquireName,
        email: inquireEmail,
        message: inquireMessage,
      });
      setInquireResult(result);
    } catch {
      setInquireResult({
        ok: false,
        statusMessage: 'Could not send. Use the direct email link or DM @adubsqz.',
        mailtoFallbackUrl: `mailto:adubsqz@gmail.com?subject=${encodeURIComponent('Lookbook access / print inquiry')}`,
        inquiryCode: '',
      });
    } finally {
      setInquireSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] bg-white font-sans text-neutral-950 antialiased">
      <div className="relative z-[1] mx-auto flex min-h-[100dvh] max-w-sm flex-col justify-center gap-5 px-4 py-10">
        <form
          onSubmit={(event) => {
            void onSubmit(event);
          }}
          className="flex flex-col gap-5"
        >
          <BrandMark />
          <p className="text-sm leading-relaxed text-photo-muted">
            Archival film prints and licensing. Enter the lookbook key from a story, DM, or card —
            or request access below.
          </p>
          <div>
            <label htmlFor="gallery-password" className="mb-1.5 block text-sm text-photo-muted">
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

        <div className="flex flex-col gap-3 border-t border-photo-border pt-5">
          <Button
            type="button"
            variant="ghost"
            className="h-11 text-sm"
            aria-expanded={drawerOpen}
            onClick={() => {
              setDrawerOpen((open) => !open);
              setInquireResult(null);
            }}
          >
            {drawerOpen ? 'Close request form' : 'Request key / print & licensing'}
          </Button>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-center text-sm text-photo-muted underline-offset-4 hover:text-photo-fg hover:underline"
          >
            Need the lookbook password? DM @adubsqz.
          </a>
        </div>

        {drawerOpen ? (
          <form
            onSubmit={(event) => {
              void onInquire(event);
            }}
            className="flex flex-col gap-4 border border-photo-border bg-photo-bg/40 p-4"
          >
            <div>
              <label htmlFor="gate-inquire-name" className="mb-1.5 block text-sm text-photo-muted">
                Name
              </label>
              <Input
                id="gate-inquire-name"
                type="text"
                name="name"
                autoComplete="name"
                value={inquireName}
                onChange={(event) => setInquireName(event.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="gate-inquire-email" className="mb-1.5 block text-sm text-photo-muted">
                Email
              </label>
              <Input
                id="gate-inquire-email"
                type="email"
                name="email"
                autoComplete="email"
                value={inquireEmail}
                onChange={(event) => setInquireEmail(event.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="gate-inquire-message" className="mb-1.5 block text-sm text-photo-muted">
                What do you need?
              </label>
              <Textarea
                id="gate-inquire-message"
                name="message"
                rows={3}
                className="resize-y text-base sm:text-sm"
                placeholder="Lookbook access, archival print quote, or licensing…"
                value={inquireMessage}
                onChange={(event) => setInquireMessage(event.target.value)}
              />
            </div>
            <Button type="submit" className="h-11" disabled={inquireSubmitting}>
              {inquireSubmitting ? 'Sending…' : 'Send request'}
            </Button>
            {inquireResult ? (
              <div className="space-y-2 text-sm" role="status">
                <p className={inquireResult.ok ? 'text-photo-muted' : 'text-mcm-brick'}>
                  {inquireResult.ok
                    ? sentConfirmationHint(inquireEmail)
                    : inquireResult.statusMessage}
                </p>
                <a
                  href={inquireResult.mailtoFallbackUrl}
                  className="inline-block text-photo-fg underline underline-offset-4"
                >
                  {inquireResult.ok
                    ? 'Prefer direct email? Open in your mail app →'
                    : 'Send directly via your mail app →'}
                </a>
              </div>
            ) : null}
          </form>
        ) : null}
      </div>
    </div>
  );
}
