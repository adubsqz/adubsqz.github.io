import { lazy, Suspense, useState } from 'react';
import type { PageView } from './types';
import BrandMark from './components/BrandMark';
import MakersSpaceView from './components/MakersSpaceView';
import { RightsReservedBlock } from './components/LicensingDetails';
import BackToTop from './components/BackToTop';

const AboutView = lazy(() => import('./components/AboutView'));
const GalleryView = lazy(() => import('./components/GalleryView'));
const ContactModal = lazy(() => import('./components/ContactModal'));

function navClass(active: boolean): string {
  return `min-h-11 text-sm tracking-wide ${
    active ? 'underline underline-offset-4' : 'text-photo-muted hover:text-photo-fg'
  }`;
}

export default function App() {
  const [view, setView] = useState<PageView>('gallery');
  const [showContact, setShowContact] = useState(false);
  const showFooter = view === 'gallery' || view === 'portfolio';
  const showBackToTop = view === 'gallery' || view === 'portfolio';

  return (
    <div className="makers-space-shell relative min-h-[100dvh] overflow-x-clip font-sans antialiased animate-table-lit">
      <div className="relative z-[1] min-h-[100dvh]">
        <header
          id="top"
          className="site-header lookbook-rail pt-[max(0.6rem,env(safe-area-inset-top))]"
        >
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-3.5 sm:px-8">
            <BrandMark ground="light" onClick={() => setView('gallery')} />
            <nav className="site-nav" aria-label="Site">
              <button
                type="button"
                aria-pressed={view === 'gallery'}
                onClick={() => setView('gallery')}
                className={navClass(view === 'gallery')}
              >
                Work
              </button>
              <button
                type="button"
                aria-pressed={view === 'portfolio'}
                onClick={() => setView('portfolio')}
                className={navClass(view === 'portfolio')}
              >
                Portfolio
              </button>
              <button
                type="button"
                id="tab-about"
                aria-pressed={view === 'about'}
                aria-controls="panel-about"
                onClick={() => setView('about')}
                className={navClass(view === 'about')}
              >
                About
              </button>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-none px-0 pb-10 sm:pb-16">
          <div
            className={
              view === 'about'
                ? 'mx-auto max-w-6xl animate-fade-up px-4 py-8 sm:px-8'
                : 'gallery-shell px-0 py-0'
            }
            role="region"
            id={`panel-${view}`}
            aria-label={view === 'gallery' ? 'gallery' : view === 'portfolio' ? 'portfolio' : undefined}
            aria-labelledby={view === 'about' ? 'tab-about' : undefined}
          >
            {view === 'gallery' && <MakersSpaceView />}
            {view === 'portfolio' && (
              <Suspense fallback={<p className="px-4 py-8 text-base text-photo-muted">Loading…</p>}>
                <GalleryView />
              </Suspense>
            )}
            {view === 'about' && (
              <Suspense fallback={<p className="text-base text-photo-muted">Loading…</p>}>
                <AboutView onContactClick={() => setShowContact(true)} />
              </Suspense>
            )}
          </div>

          {showFooter && (
            <footer className="px-4 py-8 sm:px-8">
              <RightsReservedBlock plain className="text-photo-muted [&_a]:text-photo-fg/70" />
            </footer>
          )}
        </main>
        {showBackToTop && <BackToTop />}
        {showContact && (
          <Suspense fallback={null}>
            <ContactModal onClose={() => setShowContact(false)} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
