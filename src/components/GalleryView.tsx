import { useState, useEffect, useLayoutEffect, useRef, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { COLLECTIONS } from '../data';
import { contactPrefillForPhoto } from '../inquireStatic';
import type { Photo } from '../types';
import { CONTACT_SHEET_EAGER_FRAMES, GALLERY_LIGHTBOX_PAD_CLASS } from '../gallery-layout';
import { shuffleRandom } from '../gallery-shuffle';
import WatermarkedImage from './WatermarkedImage';
import { Button } from './ui/button';

const ContactModal = lazy(() => import('./ContactModal'));
const InquiryModal = lazy(() => import('./InquiryModal'));

const photos = COLLECTIONS.flatMap((collection) => collection.photos);

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
      className="lightbox-shell fixed inset-0 z-[101] flex flex-col bg-white text-neutral-950"
      role="dialog"
      aria-modal="true"
      aria-label="Image lightbox"
    >
      <div className="flex justify-end px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center text-3xl leading-none"
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
          className="absolute left-1 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-3xl sm:left-4"
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
          className="absolute right-1 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-3xl sm:right-4"
          aria-label="View next photo"
        >
          ›
        </button>
      </div>

      <div className="flex flex-col items-center gap-1 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
        <Button
          type="button"
          onClick={onRequestInvoice}
          className="h-11 bg-neutral-950 px-8 text-white shadow-none hover:bg-neutral-800"
        >
          Request Invoice
        </Button>
        <Button
          type="button"
          onClick={onLicensing}
          variant="ghost"
          className="h-9 px-3 text-sm font-normal text-neutral-500"
        >
          Licensing or hire
        </Button>
      </div>
    </div>,
    document.body,
  );
}

function Frame({
  photo,
  eager,
  onOpen,
}: {
  photo: Photo;
  eager: boolean;
  onOpen: (photo: Photo) => void;
}) {
  const [failed, setFailed] = useState(false);
  const acceptErrorsRef = useRef(false);

  useLayoutEffect(() => {
    acceptErrorsRef.current = true;
    return () => {
      acceptErrorsRef.current = false;
    };
  }, []);

  if (failed) {
    return (
      <div className="contact-frame flex aspect-[3/2] items-center justify-center bg-neutral-100">
        <span className="select-none font-mono text-sm text-neutral-400">—</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(photo)}
      aria-label={`Open photo: ${photo.alt}`}
      className="contact-frame relative aspect-[3/2] w-full overflow-hidden bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950"
    >
      <img
        src={photo.src}
        alt={photo.alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={eager ? 'high' : 'auto'}
        draggable="false"
        className="gallery-image h-full w-full object-cover"
        onError={() => {
          if (!acceptErrorsRef.current) return;
          console.error('Gallery photo failed to load:', photo.src ?? photo.id);
          setFailed(true);
        }}
      />
    </button>
  );
}

export default function GalleryView() {
  const [frames] = useState(() => shuffleRandom(photos));
  const [index, setIndex] = useState<number | null>(null);
  const [contactPhoto, setContactPhoto] = useState<Photo | null>(null);
  const [inquiryPhoto, setInquiryPhoto] = useState<Photo | null>(null);
  const photo = index === null ? null : frames[index] ?? null;

  useEffect(() => {
    const head = document.head;
    const lcpPhoto = frames[0];
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
  }, [frames]);

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
    <div className="contact-sheet mx-auto w-full max-w-6xl bg-white px-2 py-2 sm:px-4">
      {frames.length === 0 && <p className="px-2 text-sm text-neutral-500">No photos yet.</p>}

      <ul className="grid grid-cols-4 gap-0.5 sm:grid-cols-6 lg:grid-cols-8">
        {frames.map((frame, frameIndex) => (
          <li key={frame.id}>
            <Frame
              photo={frame}
              eager={frameIndex < CONTACT_SHEET_EAGER_FRAMES}
              onOpen={() => setIndex(frameIndex)}
            />
          </li>
        ))}
      </ul>

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
