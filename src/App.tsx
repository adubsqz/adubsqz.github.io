import { lazy, Suspense, useState } from 'react';
import type { PageView } from './types';
import BrandMark from './components/BrandMark';
import GalleryView from './components/GalleryView';
import { RightsReservedBlock } from './components/LicensingDetails';
import BackToTop from './components/BackToTop';

const AboutView = lazy(() => import('./components/AboutView'));
const ContactModal = lazy(() => import('./components/ContactModal'));

export default function App() {
  const [view, setView] = useState<PageView>('gallery');
  const [showContact, setShowContact] = useState(false);

  return (
    <div className="relative min-h-[100dvh] bg-white font-sans text-neutral-950 antialiased">
      <div className="relative z-[1] min-h-[100dvh]">
        <header
          id="top"
          className="site-header border-b border-neutral-200 bg-white pt-[max(0.6rem,env(safe-area-inset-top))]"
        >
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-4 sm:px-8">
            <BrandMark onClick={() => setView('gallery')} />
            <nav className="site-nav" aria-label="Site">
              <button
                type="button"
                aria-pressed={view === 'gallery'}
                onClick={() => setView('gallery')}
                className={`min-h-11 text-sm ${view === 'gallery' ? 'underline underline-offset-4' : ''}`}
              >
                Work
              </button>
              <button
                type="button"
                id="tab-about"
                aria-pressed={view === 'about'}
                aria-controls="panel-about"
                onClick={() => setView('about')}
                className={`min-h-11 text-sm ${view === 'about' ? 'underline underline-offset-4' : ''}`}
              >
                About
              </button>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-none bg-white px-0 pb-10 sm:pb-16">
          <div
            className={
              view === 'gallery'
                ? 'gallery-shell bg-white px-0 py-6 sm:py-8'
                : 'mx-auto max-w-6xl animate-fade-up px-4 py-8 sm:px-8'
            }
            role="region"
            id={`panel-${view}`}
            aria-label={view === 'gallery' ? 'gallery' : undefined}
            aria-labelledby={view === 'about' ? 'tab-about' : undefined}
          >
            {view === 'gallery' && <GalleryView />}
            {view === 'about' && (
              <Suspense fallback={<p className="text-base text-neutral-500">Loading…</p>}>
                <AboutView onContactClick={() => setShowContact(true)} />
              </Suspense>
            )}
          </div>

          {view === 'gallery' && (
            <footer className="hidden px-4 py-8 sm:block sm:px-8">
              <RightsReservedBlock plain />
            </footer>
          )}
        </main>
        {view === 'gallery' && <BackToTop />}
        {showContact && (
          <Suspense fallback={null}>
            <ContactModal onClose={() => setShowContact(false)} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
