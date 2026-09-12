import { lazy, Suspense, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import type { GalleryFilter, PageView } from './types';
import BrandMark from './components/BrandMark';
import GraffitiLabel from './components/GraffitiLabel';
import GalleryView from './components/GalleryView';
import { collectionTone } from './collectionTone';
import { COLLECTIONS, DEFAULT_GALLERY_FILTER } from './data';
import { SITE_TAGLINE, SITE_TAGLINE_IMAGE } from './site';
import { RightsReservedBlock } from './components/LicensingDetails';

const AboutView = lazy(() => import('./components/AboutView'));
const ContactModal = lazy(() => import('./components/ContactModal'));

const totalGalleryPhotos = COLLECTIONS.reduce((n, c) => n + c.photos.length, 0);

function useWheelPan(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth + 1) return;
      const horizontalIntent = event.shiftKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY);
      if (!horizontalIntent) return;
      event.preventDefault();
      el.scrollLeft += event.deltaY + event.deltaX;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);
}

function CollectionReel({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useWheelPan(ref);

  return (
    <nav ref={ref} className="collection-reel" aria-label="Collections">
      {children}
    </nav>
  );
}

export default function App() {
  const [view, setView] = useState<PageView>('gallery');
  const [filter, setFilter] = useState<GalleryFilter>(DEFAULT_GALLERY_FILTER);
  const [showContact, setShowContact] = useState(false);

  return (
    <div className="relative min-h-[100dvh] font-sans text-photo-fg antialiased selection:bg-mcm-brick/20">
      <div className="cinematic-grid" aria-hidden />
      <div className="relative z-[1] min-h-[100dvh]">
        <header className="site-header sticky top-0 z-20 overflow-x-clip border-b border-mcm-line/50 bg-mcm-cream pt-[max(0.6rem,env(safe-area-inset-top))] sm:pt-0">
          <div className="site-chrome mx-auto flex max-w-7xl flex-col items-start gap-2 px-4 pb-3 sm:gap-3 sm:px-8 sm:pb-3 sm:pt-6 lg:px-10">
            <BrandMark
              pressed={view === 'about'}
              onClick={() => setView((current) => (current === 'about' ? 'gallery' : 'about'))}
            />
            <p className="site-tagline">
              <img src={SITE_TAGLINE_IMAGE} alt={SITE_TAGLINE} width={2400} height={314} />
            </p>
            {view === 'gallery' && (
              <CollectionReel>
                {COLLECTIONS.map((collection) => {
                  const active = filter === collection.id;
                  return (
                    <h2 key={collection.id} className="graffiti-heading graffiti-heading--h2">
                      <button
                        type="button"
                        aria-pressed={active}
                        onClick={() => setFilter(collection.id)}
                        className="graffiti-nav min-h-11"
                      >
                        <GraffitiLabel
                          text={collection.title}
                          on={active}
                          tone={collectionTone(collection.id)}
                        />
                      </button>
                    </h2>
                  );
                })}
              </CollectionReel>
            )}
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-0 pb-10 sm:pb-16">
          <div
            className={
              view === 'gallery'
                ? 'gallery-shell animate-fade-up px-0 py-1 sm:py-6'
                : 'animate-fade-up px-4 py-6 sm:px-2 sm:py-8'
            }
            role="region"
            id={`panel-${view}`}
            aria-label={view === 'gallery' ? 'gallery' : undefined}
            aria-labelledby={view === 'about' ? 'tab-about' : undefined}
          >
            {view === 'gallery' && <GalleryView filter={filter} />}
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
            <footer className="hidden px-4 py-8 sm:block sm:px-6">
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
