import { useState, useEffect, useLayoutEffect, useRef, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { COLLECTIONS } from '../data';
import { contactPrefillForPhoto } from '../inquireStatic';
import type { Photo } from '../types';
import {
  CONTACT_SHEET_EAGER_FRAMES,
  GALLERY_LIGHTBOX_PAD_CLASS,
  collageEagerFrameCount,
} from '../gallery-layout';
import { arrangeContactSheet } from '../gallery-sheet-order';
import WatermarkedImage from './WatermarkedImage';
import { Button } from './ui/button';

const ContactModal = lazy(() => import('./ContactModal'));
const InquiryModal = lazy(() => import('./InquiryModal'));

/** Stable sheet order — same spots every load so we can preload the first cells. */
const frames = arrangeContactSheet(COLLECTIONS);

function sheetHref(photo: Photo): string {
  return photo.sheetSrc ?? photo.src;
}

function displayName(alt: string): string {
  return alt.replace(/^Photograph\s+/i, '');
}

function Lightbox({
  photo,
  onClose,
  onRequestInvoice,
  onLicensing,
  onPrevious,
  onNext,
}: {
  photo: Photo;
  onClose: () => void;
  onRequestInvoice: () => void;
  onLicensing: () => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrevious();
      if (e.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, onPrevious, onNext]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  return createPortal(
    <div
      className="lightbox-shell fixed inset-0 z-[101] flex flex-col bg-mcm-ink text-mcm-cream"
      role="dialog"
      aria-modal="true"
      aria-label="Image lightbox"
    >
      <div className="flex justify-end px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center text-3xl leading-none text-mcm-cream"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <div
        className={`lightbox-stage relative flex min-h-0 flex-1 items-center justify-center ${GALLERY_LIGHTBOX_PAD_CLASS}`}
      >
        <button
          type="button"
          onClick={onPrevious}
          className="absolute left-1 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-3xl text-mcm-cream sm:left-4"
          aria-label="View previous photo"
        >
          ‹
        </button>
        <WatermarkedImage
          src={photo.src}
          alt={photo.alt}
          wrapperClassName="relative flex h-full max-h-full w-full items-center justify-center"
          className="pointer-events-none block max-h-full w-auto max-w-full object-contain"
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
        <button
          type="button"
          onClick={onNext}
          className="absolute right-1 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-3xl text-mcm-cream sm:right-4"
          aria-label="View next photo"
        >
          ›
        </button>
      </div>

      <div className="flex flex-col items-center gap-1 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
        <Button type="button" onClick={onRequestInvoice} variant="lightboxPrimary" className="h-11 px-8">
          Request a print quote
        </Button>
        <Button
          type="button"
          onClick={onLicensing}
          variant="ghost"
          className="h-9 px-3 text-sm font-normal text-mcm-cream/70 hover:text-mcm-cream"
        >
          Licensing or hire
        </Button>
      </div>
    </div>,
    document.body,
  );
}

function CollageCell({
  photo,
  eager,
  onOpen,
}: {
  photo: Photo;
  eager: boolean;
  onOpen: (photo: Photo) => void;
}) {
  const cellRef = useRef<HTMLButtonElement>(null);
  const [failed, setFailed] = useState(false);
  const [loadSrc, setLoadSrc] = useState(eager);
  const acceptErrorsRef = useRef(false);

  useLayoutEffect(() => {
    acceptErrorsRef.current = true;
    return () => {
      acceptErrorsRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (eager || loadSrc) return;
    const node = cellRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setLoadSrc(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setLoadSrc(true);
          io.disconnect();
        }
      },
      {
        root: null,
        rootMargin: '80px',
        threshold: 0,
      },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [eager, loadSrc]);

  return (
    <button
      ref={cellRef}
      type="button"
      onClick={() => onOpen(photo)}
      aria-label={`Open photo: ${photo.alt}`}
      className="lookbook-cell group relative min-h-[42dvh] overflow-hidden bg-mcm-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-mcm-cream sm:min-h-[50dvh]"
    >
      {failed ? (
        <span className="flex h-full min-h-[42dvh] items-center justify-center font-mono text-sm text-mcm-cream/40 sm:min-h-[50dvh]">
          —
        </span>
      ) : loadSrc ? (
        <img
          src={sheetHref(photo)}
          alt=""
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={eager ? 'high' : 'auto'}
          draggable="false"
          className="gallery-image absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
          onError={() => {
            if (!acceptErrorsRef.current) return;
            console.error('Gallery photo failed to load:', sheetHref(photo));
            setFailed(true);
          }}
        />
      ) : (
        <span className="lookbook-cell-fallback absolute inset-0 bg-mcm-ink" aria-hidden="true" />
      )}
      <span className="grease-pencil grease-pencil--on-ink absolute inset-x-0 bottom-0 z-[1] bg-gradient-to-t from-mcm-ink/80 to-transparent px-2 pb-2 pt-8 text-left opacity-90">
        {displayName(photo.alt)}
      </span>
    </button>
  );
}

export default function GalleryView() {
  const [index, setIndex] = useState<number | null>(null);
  const [contactPhoto, setContactPhoto] = useState<Photo | null>(null);
  const [inquiryPhoto, setInquiryPhoto] = useState<Photo | null>(null);
  const [eagerCount, setEagerCount] = useState(() =>
    typeof window !== 'undefined' ? collageEagerFrameCount(window.innerWidth) : CONTACT_SHEET_EAGER_FRAMES,
  );
  const photo = index === null ? null : frames[index] ?? null;

  useLayoutEffect(() => {
    const syncEager = () => setEagerCount(collageEagerFrameCount(window.innerWidth));
    syncEager();
    window.addEventListener('resize', syncEager);
    return () => window.removeEventListener('resize', syncEager);
  }, []);

  useLayoutEffect(() => {
    const head = document.head;
    const eager = frames.slice(0, eagerCount);
    if (eager.length === 0) return;
    const existing = new Set(
      [...head.querySelectorAll('link[rel="preload"][as="image"]')].map((link) => link.getAttribute('href')),
    );
    const links: HTMLLinkElement[] = [];
    eager.forEach((still, i) => {
      const href = sheetHref(still);
      if (existing.has(href)) return;
      const link = document.createElement('link');
      link.setAttribute('rel', 'preload');
      link.setAttribute('as', 'image');
      link.href = href;
      if (i === 0) link.setAttribute('fetchpriority', 'high');
      head.appendChild(link);
      links.push(link);
    });
    return () => {
      for (const link of links) link.remove();
    };
  }, [eagerCount]);

  const move = (direction: 'next' | 'previous') => {
    if (frames.length === 0 || index === null) return;
    const step = direction === 'next' ? 1 : -1;
    setIndex((current) => {
      if (current === null) return current;
      return (current + step + frames.length) % frames.length;
    });
  };

  const contactPrefill = contactPhoto ? contactPrefillForPhoto(contactPhoto) : null;

  return (
    <div className="lookbook-collage w-full">
      {frames.length === 0 && <p className="px-4 py-8 text-sm text-mcm-cream/50">No photos yet.</p>}

      <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
        {frames.map((frame, frameIndex) => (
          <CollageCell
            key={frame.id}
            photo={frame}
            eager={frameIndex < eagerCount}
            onOpen={() => setIndex(frameIndex)}
          />
        ))}
      </div>

      {photo && (
        <Lightbox
          photo={photo}
          onClose={() => setIndex(null)}
          onRequestInvoice={() => {
            setInquiryPhoto(photo);
            setIndex(null);
          }}
          onLicensing={() => {
            setContactPhoto(photo);
            setIndex(null);
          }}
          onPrevious={() => move('previous')}
          onNext={() => move('next')}
        />
      )}

      {inquiryPhoto && (
        <Suspense fallback={null}>
          <InquiryModal photo={inquiryPhoto} onClose={() => setInquiryPhoto(null)} />
        </Suspense>
      )}

      {contactPhoto && contactPrefill && (
        <Suspense fallback={null}>
          <ContactModal
            initialSubject={contactPrefill.subject}
            initialMessage={contactPrefill.message}
            onClose={() => setContactPhoto(null)}
          />
        </Suspense>
      )}
    </div>
  );
}
