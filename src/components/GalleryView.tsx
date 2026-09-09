import { useState, useEffect, useLayoutEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { COLLECTIONS } from '../data';
import { contactPrefillForPhoto } from '../inquireStatic';
import type { Photo, PhotoCollection } from '../types';
import type { GalleryFilter } from '../types';
import {
  GALLERY_FIRST_PAINT_STILLS,
  GALLERY_LIGHTBOX_PAD_CLASS,
  GALLERY_LOOKBOOK_CLASS,
  GALLERY_STILL_ITEM_CLASS,
  GALLERY_STILL_OFFSCREEN_CLASS,
  GALLERY_STILL_STACK_CLASS,
  imageClassForStill,
  intrinsicSizeForStill,
} from '../gallery-layout';
import WatermarkedImage from './WatermarkedImage';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

const ContactModal = lazy(() => import('./ContactModal'));

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

function PhotoCard({
  photo,
  onClick,
  fetchPriority,
  loading,
  className = '',
}: {
  photo: Photo;
  onClick: () => void;
  fetchPriority?: 'high' | 'low' | 'auto';
  /** First screenful uses eager loads so lazy+layout containment cannot starve fetches (incl. Strict Mode remounts). */
  loading?: 'lazy' | 'eager';
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const btnRef = useRef<HTMLButtonElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const acceptErrorsRef = useRef(false);

  useLayoutEffect(() => {
    acceptErrorsRef.current = true;
    return () => {
      acceptErrorsRef.current = false;
    };
  }, []);

  const handleError = () => {
    if (!acceptErrorsRef.current) return;
    console.error('Gallery photo failed to load:', photo.src ?? photo.id);
    setFailed(true);
  };

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (reducedMotion || e.pointerType === 'touch' || !btnRef.current) return;
      const r = btnRef.current.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      setTilt({ rx: y * -5.5, ry: x * 5.5 });
    },
    [reducedMotion],
  );

  const onPointerLeave = useCallback(() => setTilt({ rx: 0, ry: 0 }), []);

  if (failed) {
    return (
      <div
        className={`flex aspect-[4/5] w-full items-center justify-center bg-mcm-paper/30 sm:rounded-md ${className}`}
      >
        <span className="text-photo-muted/40 text-sm select-none font-mono">—</span>
      </div>
    );
  }

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={onClick}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onPointerCancel={onPointerLeave}
      aria-label={`Open photo: ${photo.alt}`}
      className={`group flex w-full justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-mcm-brick focus-visible:ring-offset-2 focus-visible:ring-offset-photo-bg ${className}`}
      style={{ perspective: '880px' }}
    >
      <div
        className="relative mx-auto w-full max-w-full overflow-hidden bg-photo-bg sm:w-fit sm:rounded-md sm:shadow-[0_16px_40px_rgba(26,23,20,0.12)] sm:ring-1 sm:ring-photo-fg/10 motion-safe:duration-300 [transform-style:preserve-3d]"
        style={
          reducedMotion
            ? undefined
            : {
                transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) scale(1.002)`,
              }
        }
      >
        <WatermarkedImage
          key={photo.src}
          src={photo.src}
          alt={photo.alt}
          wrapperClassName="relative inline-block w-full max-w-full sm:w-fit"
          className={imageClassForStill(photo.orientation)}
          width={intrinsicSizeForStill(photo.orientation).width}
          height={intrinsicSizeForStill(photo.orientation).height}
          loading={loading ?? 'lazy'}
          decoding="async"
          fetchPriority={fetchPriority}
          onError={handleError}
          onClick={onClick}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-mcm-ink/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 sm:rounded-md" />
      </div>
      {photo.caption && (
        <p className="mt-3 text-photo-muted/85 text-[0.7rem] leading-relaxed font-mono tracking-wide">
          {photo.caption}
        </p>
      )}
    </button>
  );
}

function Lightbox({
  photo,
  onClose,
  onContact,
  onPrevious,
  onNext,
}: {
  photo: Photo;
  onClose: () => void;
  onContact: () => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

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
    const el = scrollRef.current;
    if (el) el.scrollTop = 0;
  }, [photo.id, photo.src]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  return createPortal(
    <>
      <div className="fixed inset-0 z-[100] bg-mcm-cream" aria-hidden onClick={onClose} />
      <div
        ref={scrollRef}
        className="lightbox-shell fixed inset-0 z-[101] overflow-y-auto overflow-x-hidden overscroll-contain bg-mcm-cream text-photo-fg"
        role="dialog"
        aria-modal="true"
        aria-label="Image lightbox"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-20 flex h-12 w-12 items-center justify-center text-3xl leading-none text-photo-fg sm:right-6 sm:top-6 sm:h-11 sm:w-11 sm:rounded-xl sm:bg-photo-panel/90"
          aria-label="Close"
        >
          ×
        </button>
        <button
          type="button"
          onClick={onPrevious}
          className="absolute left-2 top-[42%] z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl bg-photo-panel/90 text-xl text-photo-fg sm:flex"
          aria-label="View previous photo"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={onNext}
          className="absolute right-2 top-[42%] z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl bg-photo-panel/90 text-xl text-photo-fg sm:flex"
          aria-label="View next photo"
        >
          ›
        </button>

        <div className={`mx-auto flex min-h-[100dvh] w-full max-w-[min(1200px,100vw)] flex-col justify-center ${GALLERY_LIGHTBOX_PAD_CLASS} pb-28 pt-4 sm:pb-28 sm:pt-12`}>
          <figure className="flex w-full shrink-0 justify-center">
            <div className="lightbox-frame lightbox-frame--hero w-auto max-w-full sm:max-w-[min(1100px,calc(100vw-4rem))]">
              <WatermarkedImage
                src={photo.src}
                alt={photo.alt}
                wrapperClassName="relative flex w-full max-w-full items-center justify-center"
                className="pointer-events-none block h-auto max-h-[min(78dvh,920px)] w-auto min-h-0 max-w-full object-contain sm:max-h-[min(80dvh,960px)]"
                loading="eager"
                decoding="async"
                fetchPriority="high"
              />
            </div>
          </figure>

          {photo.caption && (
            <Card className="mt-6 rounded-2xl border-photo-border/70 bg-photo-panel/60">
              <CardContent className="px-5 py-4 sm:px-8">
                <p className="text-center text-sm italic leading-relaxed text-photo-muted">{photo.caption}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-mcm-cream via-mcm-cream/95 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-10">
          <div className="pointer-events-auto mx-auto flex max-w-lg items-center gap-2">
            <Button
              type="button"
              onClick={onPrevious}
              variant="ghost"
              className="h-12 w-12 shrink-0 rounded-xl px-0 text-2xl sm:hidden"
              aria-label="View previous photo"
            >
              ‹
            </Button>
            <Button
              type="button"
              onClick={onContact}
              variant="lightboxPrimary"
              className="h-12 flex-1 rounded-xl text-lg font-medium"
            >
              Contact me
            </Button>
            <Button
              type="button"
              onClick={onNext}
              variant="ghost"
              className="h-12 w-12 shrink-0 rounded-xl px-0 text-2xl sm:hidden"
              aria-label="View next photo"
            >
              ›
            </Button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}

function LookbookStill({
  photo,
  index,
  onPhotoClick,
}: {
  photo: Photo;
  index: number;
  onPhotoClick: (photo: Photo) => void;
}) {
  const itemRef = useRef<HTMLLIElement>(null);
  const [active, setActive] = useState(index < GALLERY_FIRST_PAINT_STILLS);
  const size = intrinsicSizeForStill(photo.orientation);

  useEffect(() => {
    if (active) return;
    const node = itemRef.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') {
      setActive(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setActive(true);
          io.disconnect();
        }
      },
      { root: null, rootMargin: '80px 0px', threshold: 0.01 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [active]);

  return (
    <li
      ref={itemRef}
      className={`${GALLERY_STILL_ITEM_CLASS}${index === 0 ? '' : ` ${GALLERY_STILL_OFFSCREEN_CLASS}`}`}
      style={active ? undefined : { aspectRatio: `${size.width} / ${size.height}` }}
    >
      {active ? (
        <PhotoCard
          photo={photo}
          onClick={() => onPhotoClick(photo)}
          fetchPriority={index === 0 ? 'high' : 'auto'}
          loading={index === 0 ? 'eager' : 'lazy'}
        />
      ) : (
        <div className="w-full bg-mcm-paper/20" aria-hidden />
      )}
    </li>
  );
}

function CollectionSection({
  collection,
  onPhotoClick,
}: {
  collection: PhotoCollection;
  onPhotoClick: (photo: Photo) => void;
}) {
  const photos = collection.photos;

  useEffect(() => {
    const head = document.head;
    const lcpPhoto = photos[0];
    if (!lcpPhoto) return;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = lcpPhoto.src;
    link.setAttribute('fetchpriority', 'high');
    head.appendChild(link);
    return () => {
      link.remove();
    };
  }, [photos]);

  if (photos.length === 0) return null;

  return (
    <section className={GALLERY_LOOKBOOK_CLASS} aria-label={`Gallery reel for ${collection.title}`}>
      <ul className={GALLERY_STILL_STACK_CLASS}>
        {photos.map((photo, i) => (
          <LookbookStill key={photo.id} photo={photo} index={i} onPhotoClick={onPhotoClick} />
        ))}
      </ul>
    </section>
  );
}

interface GalleryViewProps {
  filter: GalleryFilter;
}

export default function GalleryView({ filter }: GalleryViewProps) {
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null);
  const [contactPhoto, setContactPhoto] = useState<Photo | null>(null);
  const collection: PhotoCollection = COLLECTIONS.find((c) => c.id === filter)
    ?? COLLECTIONS[0]
    ?? { id: 'empty', title: 'Empty', photos: [] };

  useEffect(() => {
    if (!lightboxPhoto) return;
    const exists = collection.photos.some((photo) => photo.id === lightboxPhoto.id);
    if (!exists) setLightboxPhoto(null);
  }, [collection.photos, lightboxPhoto]);

  const handleContact = () => {
    if (!lightboxPhoto) return;
    setContactPhoto(lightboxPhoto);
    setLightboxPhoto(null);
  };

  const handleLightboxMove = (direction: 'next' | 'previous') => {
    if (!lightboxPhoto) return;
    if (collection.photos.length === 0) return;
    const currentIndex = collection.photos.findIndex((photo) => photo.id === lightboxPhoto.id);
    if (currentIndex < 0) return;
    const step = direction === 'next' ? 1 : -1;
    const nextIndex =
      (currentIndex + step + collection.photos.length) % collection.photos.length;
    setLightboxPhoto(collection.photos[nextIndex]);
  };

  const contactPrefill = contactPhoto ? contactPrefillForPhoto(contactPhoto) : null;

  return (
    <div className="space-y-6">
      {collection.photos.length === 0 && (
        <p className="text-sm text-photo-muted">No photos found in this category.</p>
      )}

      <CollectionSection collection={collection} onPhotoClick={setLightboxPhoto} />

      {lightboxPhoto && (
        <Lightbox
          photo={lightboxPhoto}
          onClose={() => setLightboxPhoto(null)}
          onContact={handleContact}
          onPrevious={() => handleLightboxMove('previous')}
          onNext={() => handleLightboxMove('next')}
        />
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
