import { useState } from 'react';
import type { PageView, GalleryFilter } from './types';
import GalleryView from './components/GalleryView';
import AboutView from './components/AboutView';
import ContactModal from './components/ContactModal';

const TABS: { id: PageView; label: string }[] = [
  { id: 'gallery', label: 'Gallery' },
  { id: 'about', label: 'About' },
];

export default function App() {
  const [view, setView] = useState<PageView>('gallery');
  const [galleryFilter, setGalleryFilter] = useState<GalleryFilter>('bw');
  const [showContact, setShowContact] = useState(false);

  return (
    <div className="min-h-screen text-photo-fg font-sans antialiased">
      <div className="relative min-h-screen">
        <main className="relative max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-6 sm:py-8">
          <div className="rounded-3xl bg-photo-panel/95 shadow-[0_26px_80px_rgba(0,0,0,0.9)] backdrop-blur-md overflow-hidden">
            <div className="pt-1">
              <nav className="flex" role="tablist" aria-label="Main">
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
                      className={`flex-1 py-4 sm:py-5 text-sm font-medium uppercase tracking-wider transition-colors ${
                        active
                          ? 'text-photo-accent border-b-2 border-photo-accent -mb-px'
                          : 'text-photo-muted hover:text-photo-fg border-b-2 border-transparent'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
              {view === 'gallery' && (
                <div className="flex gap-6 px-6 sm:px-8 pb-3 pt-1 text-xs uppercase tracking-wider">
                  <button
                    type="button"
                    onClick={() => setGalleryFilter('bw')}
                    className={`transition-colors ${
                      galleryFilter === 'bw'
                        ? 'text-photo-accent border-b-2 border-photo-accent -mb-px pb-1'
                        : 'text-photo-muted hover:text-photo-fg border-b-2 border-transparent pb-1'
                    }`}
                  >
                    B&W
                  </button>
                  <span className="text-photo-border">|</span>
                  <button
                    type="button"
                    onClick={() => setGalleryFilter('color')}
                    className={`transition-colors ${
                      galleryFilter === 'color'
                        ? 'text-photo-accent border-b-2 border-photo-accent -mb-px pb-1'
                        : 'text-photo-muted hover:text-photo-fg border-b-2 border-transparent pb-1'
                    }`}
                  >
                    Color
                  </button>
                  <span className="text-photo-border">|</span>
                  <button
                    type="button"
                    onClick={() => setGalleryFilter('redscale')}
                    className={`transition-colors ${
                      galleryFilter === 'redscale'
                        ? 'text-photo-accent border-b-2 border-photo-accent -mb-px pb-1'
                        : 'text-photo-muted hover:text-photo-fg border-b-2 border-transparent pb-1'
                    }`}
                  >
                    Redscale
                  </button>
                </div>
              )}
            </div>
            <div
              className="p-5 sm:p-7 md:p-8 lg:p-10 animate-fade-up"
              role="tabpanel"
              id={`panel-${view}`}
              aria-labelledby={`tab-${view}`}
            >
              {view === 'gallery' && <GalleryView filter={galleryFilter} />}
              {view === 'about' && <AboutView onContactClick={() => setShowContact(true)} />}
            </div>
          </div>
        </main>
        {showContact && <ContactModal onClose={() => setShowContact(false)} />}
      </div>
    </div>
  );
}
