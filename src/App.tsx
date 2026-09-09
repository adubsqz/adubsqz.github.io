import { lazy, Suspense, useState } from 'react';
import type { PageView, GalleryFilter } from './types';
import GalleryView from './components/GalleryView';
import { COLLECTIONS, DEFAULT_GALLERY_FILTER } from './data';
import { RightsReservedBlock } from './components/LicensingDetails';

const AboutView = lazy(() => import('./components/AboutView'));
const ContactModal = lazy(() => import('./components/ContactModal'));

const totalGalleryPhotos = COLLECTIONS.reduce((n, c) => n + c.photos.length, 0);

const TABS: { id: PageView; label: string }[] = [
  { id: 'gallery', label: 'Gallery' },
  { id: 'about', label: 'About me' },
];

export default function App() {
  const [view, setView] = useState<PageView>('gallery');
  const [galleryFilter, setGalleryFilter] = useState<GalleryFilter>(DEFAULT_GALLERY_FILTER);
  const [showContact, setShowContact] = useState(false);

  return (
    <div className="relative min-h-[100dvh] font-sans text-photo-fg antialiased selection:bg-mcm-brick/20">
      <div className="cinematic-grid" aria-hidden />
      <div className="relative z-[1] min-h-[100dvh]">
        <header className="sticky top-0 z-20 border-b border-mcm-line/50 bg-gradient-to-b from-mcm-cream from-70% to-mcm-cream/0 pt-[max(0.6rem,env(safe-area-inset-top))] sm:static sm:border-0 sm:bg-none sm:pt-0">
          <div className="mx-auto flex max-w-7xl items-baseline justify-between gap-4 px-4 pb-3 sm:items-end sm:px-8 sm:pb-0 sm:pt-10 lg:px-10">
            <div>
              <h1 className="font-display text-[1.9rem] font-normal leading-none tracking-normal text-photo-fg sm:text-5xl">
                adubsqz
              </h1>
              <p className="mt-2 hidden max-w-[16rem] text-[1.05rem] leading-snug text-photo-muted sm:block">
                film stills. one conversation.
              </p>
            </div>
            <nav className="flex shrink-0 gap-5 sm:gap-8" role="tablist" aria-label="Main">
              {TABS.map((tab) => {
                const active = view === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-controls={`panel-${tab.id}`}
                    id={`tab-${tab.id}`}
                    onClick={() => setView(tab.id)}
                    className={`min-h-11 text-[1.05rem] leading-none transition-colors sm:text-lg ${
                      active
                        ? 'text-photo-fg underline decoration-mcm-brick decoration-2 underline-offset-[7px]'
                        : 'text-photo-muted hover:text-photo-fg'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {view === 'gallery' && (
            <div className="mx-auto flex max-w-7xl flex-wrap gap-x-5 gap-y-1 px-4 pb-3 pt-2 sm:px-8 sm:pb-0 sm:pt-6 lg:px-10">
              {COLLECTIONS.map((collection) => {
                const active = galleryFilter === collection.id;
                return (
                  <button
                    key={collection.id}
                    type="button"
                    onClick={() => setGalleryFilter(collection.id)}
                    className={`min-h-11 text-[1.05rem] transition-colors ${
                      active ? 'text-mcm-rust' : 'text-photo-muted hover:text-photo-fg'
                    }`}
                  >
                    {collection.title}
                  </button>
                );
              })}
            </div>
          )}
        </header>

        <main className="mx-auto max-w-7xl px-0 pb-10 sm:px-8 sm:pb-16 lg:px-10">
          <div
            className={
              view === 'gallery'
                ? 'animate-fade-up px-0 py-1 sm:py-6'
                : 'animate-fade-up px-4 py-6 sm:px-2 sm:py-8'
            }
            role="tabpanel"
            id={`panel-${view}`}
            aria-labelledby={`tab-${view}`}
          >
            {view === 'gallery' && <GalleryView filter={galleryFilter} />}
            {view === 'gallery' && totalGalleryPhotos === 0 && (
              <p className="mt-4 px-4 text-base text-photo-muted">
                Gallery is empty. After you finish an import, finalized entries live in{' '}
                <code className="text-photo-muted/90">src/gallery-manifest.json</code> and ship from{' '}
                <code className="text-photo-muted/90">public/photos/still-life/</code> (see repo design spec for the
                Python tool path).
              </p>
            )}
            {view === 'about' && (
              <Suspense fallback={<p className="text-base text-photo-muted">Loading…</p>}>
                <AboutView onContactClick={() => setShowContact(true)} />
              </Suspense>
            )}
          </div>

          {view === 'gallery' && (
            <footer className="hidden px-1 py-8 sm:block">
              <RightsReservedBlock plain />
            </footer>
          )}
        </main>
        {showContact && (
          <Suspense fallback={null}>
            <ContactModal onClose={() => setShowContact(false)} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
