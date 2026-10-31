import { useEffect, useState } from 'react';

const SHOW_AFTER_PX = 280;

export default function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > SHOW_AFTER_PX);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!show) return null;

  return (
    <button
      type="button"
      className="back-to-top fixed bottom-5 right-4 z-30 min-h-11 border border-photo-border bg-mcm-paper px-4 text-sm text-photo-fg hover:border-mcm-brick/50 hover:text-mcm-brick sm:bottom-8 sm:right-6"
      onClick={() => {
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
      }}
    >
      Back to top
    </button>
  );
}
