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
    <div className="lookbook-ink relative min-h-[100dvh] overflow-x-clip font-sans text-mcm-cream antialiased animate-table-lit">
      <div className="relative z-[1] min-h-[100dvh]">
        <header
          id="top"
          className="site-header lookbook-rail pt-[max(0.6rem,env(safe-area-inset-top))]"
        >
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-3.5 sm:px-8">
            <BrandMark onClick={() => setView('gallery')} />
            <nav className="site-nav" aria-label="Site">
              <button
                type="button"
                aria-pressed={view === 'gallery'}
                onClick={() => setView('gallery')}
                className={`min-h-11 text-sm tracking-wide ${view === 'gallery' ? 'underline underline-offset-4' : 'text-mcm-cream/65 hover:text-mcm-cream'}`}
              >
                Work
              </button>
              <button
                type="button"
                id="tab-about"
                aria-pressed={view === 'about'}
                aria-controls="panel-about"
                onClick={() => setView('about')}
                className={`min-h-11 text-sm tracking-wide ${view === 'about' ? 'underline underline-offset-4' : 'text-mcm-cream/65 hover:text-mcm-cream'}`}
              >
                About
              </button>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-none px-0 pb-10 sm:pb-16">
          <div
            className={
              view === 'gallery'
                ? 'gallery-shell px-0 py-0'
                : 'mx-auto max-w-3xl animate-fade-up px-4 py-8 sm:px-8'
            }
            role="region"
            id={`panel-${view}`}
            aria-label={view === 'gallery' ? 'gallery' : undefined}
            aria-labelledby={view === 'about' ? 'tab-about' : undefined}
          >
            {view === 'gallery' && <GalleryView />}
            {view === 'about' && (
              <Suspense fallback={<p className="text-base text-mcm-cream/60">Loading…</p>}>
                <AboutView onContactClick={() => setShowContact(true)} />
              </Suspense>
            )}
          </div>

          {view === 'gallery' && (
            <footer className="px-4 py-8 sm:px-8">
              <RightsReservedBlock plain className="text-mcm-cream/55 [&_a]:text-mcm-cream/70" />
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
