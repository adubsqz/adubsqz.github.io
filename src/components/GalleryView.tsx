import { useState, useEffect, useLayoutEffect, useRef, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { COLLECTIONS } from '../data';
import { contactPrefillForPhoto } from '../inquireStatic';
import type { Photo } from '../types';
import {
  CONTACT_SHEET_INITIAL_THUMBS,
  GALLERY_LIGHTBOX_PAD_CLASS,
  imageClassForStill,
  intrinsicSizeForStill,
} from '../gallery-layout';
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

function ContactThumb({
  photo,
  index,
  selected,
  onSelect,
}: {
  photo: Photo;
  index: number;
  selected: boolean;
  onSelect: (index: number) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(index < CONTACT_SHEET_INITIAL_THUMBS || selected);
  const size = intrinsicSizeForStill(photo.orientation);

  useEffect(() => {
    if (selected) setVisible(true);
  }, [selected]);

  useEffect(() => {
    if (visible) return;
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const root = node.closest('.contact-thumbs');
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { root: root instanceof Element ? root : null, rootMargin: '0px 48px', threshold: 0.01 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [visible]);

  return (
    <button
      ref={ref}
      id={`contact-thumb-${photo.id}`}
      type="button"
      aria-pressed={selected}
      aria-label={`Select photo: ${photo.alt}`}
      onClick={() => onSelect(index)}
      className={`contact-thumb h-16 w-16 shrink-0 overflow-hidden border bg-neutral-100 sm:h-[4.5rem] sm:w-[4.5rem] ${
        selected ? 'border-neutral-950' : 'border-transparent'
      }`}
    >
      {visible ? (
        <img
          src={photo.src}
          alt=""
          width={size.width}
          height={size.height}
          loading="lazy"
          decoding="async"
          draggable="false"
          className="gallery-image h-full w-full object-cover"
        />
      ) : null}
    </button>
  );
}

function Hero({ photo, onOpen }: { photo: Photo; onOpen: (photo: Photo) => void }) {
  const [failed, setFailed] = useState(false);
  const acceptErrorsRef = useRef(false);
  const size = intrinsicSizeForStill(photo.orientation);

  useLayoutEffect(() => {
    acceptErrorsRef.current = true;
    return () => {
      acceptErrorsRef.current = false;
    };
  }, []);

  if (failed) {
    return (
      <div className="flex min-h-40 items-center justify-center">
        <span className="select-none font-mono text-sm text-neutral-400">—</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(photo)}
      aria-label={`Open photo: ${photo.alt}`}
      className="flex w-full justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-4"
    >
      <WatermarkedImage
        key={photo.src}
        src={photo.src}
        alt={photo.alt}
        wrapperClassName="relative inline-block max-w-full"
        className={imageClassForStill(photo.orientation)}
        width={size.width}
        height={size.height}
        loading="eager"
        decoding="async"
        fetchPriority="high"
        onError={() => {
          if (!acceptErrorsRef.current) return;
          console.error('Gallery photo failed to load:', photo.src ?? photo.id);
          setFailed(true);
        }}
        onClick={() => onOpen(photo)}
      />
    </button>
  );
}

export default function GalleryView() {
  const [index, setIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [contactPhoto, setContactPhoto] = useState<Photo | null>(null);
  const [inquiryPhoto, setInquiryPhoto] = useState<Photo | null>(null);
  const photo = photos[index] ?? null;

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
  }, []);

  useEffect(() => {
    if (!photo) return;
    document.getElementById(`contact-thumb-${photo.id}`)?.scrollIntoView?.({
      inline: 'nearest',
      block: 'nearest',
    });
  }, [photo]);

  const move = (direction: 'next' | 'previous') => {
    if (photos.length === 0) return;
    const step = direction === 'next' ? 1 : -1;
    setIndex((current) => (current + step + photos.length) % photos.length);
  };

  const contactPrefill = contactPhoto ? contactPrefillForPhoto(contactPhoto) : null;

  return (
    <div className="contact-sheet mx-auto w-full max-w-6xl bg-white px-4 sm:px-8">
      {photos.length === 0 && <p className="text-sm text-neutral-500">No photos yet.</p>}

      {photo && (
        <>
          <Hero photo={photo} onOpen={() => setLightboxOpen(true)} />
          <div className="contact-thumbs mt-4 flex gap-2 overflow-x-auto pb-2">
            {photos.map((thumb, thumbIndex) => (
              <ContactThumb
                key={thumb.id}
                photo={thumb}
                index={thumbIndex}
                selected={thumbIndex === index}
                onSelect={setIndex}
              />
            ))}
          </div>
        </>
      )}

      {lightboxOpen && photo && (
        <Lightbox
          photo={photo}
          onClose={() => setLightboxOpen(false)}
          onRequestInvoice={() => {
            setInquiryPhoto(photo);
            setLightboxOpen(false);
          }}
          onLicensing={() => {
            setContactPhoto(photo);
            setLightboxOpen(false);
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
