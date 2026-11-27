import { useMemo, useState } from 'react';
import type { Photo } from '../types';
import { sheetUrl, stillLifeUrl, todaysMakersSpaceSeats } from '../makers-space-day';
import WatermarkedImage from './WatermarkedImage';

type MakersSpaceViewProps = {
  /** Injectable clock for tests / previews. */
  now?: Date;
};

type SeatCard = Photo & { fullSrc: string };

function seatPhoto(path: string, seat: number): SeatCard {
  const stem = path.split('/').pop()?.replace(/\.[^.]+$/, '') ?? `seat-${seat}`;
  return {
    id: `makers-${seat}-${stem}`,
    // Grid uses sheet thumbs (~640px); lightbox opens the publish still-life.
    src: sheetUrl(path),
    fullSrc: stillLifeUrl(path),
    alt: stem.replace(/[-_]/g, ' '),
  };
}

function mobileRowForSeat(seat: number): 1 | 2 | 3 {
  if (seat === 3 || seat === 5) return 1;
  if (seat === 2 || seat === 4 || seat === 6) return 2;
  return 3;
}

export default function MakersSpaceView({ now = new Date() }: MakersSpaceViewProps) {
  const paths = useMemo(() => todaysMakersSpaceSeats(now), [now]);
  const seats = useMemo(
    () => paths.map((path, i) => seatPhoto(path, i + 1)),
    [paths],
  );
  const [active, setActive] = useState<SeatCard | null>(null);

  return (
    <section
      data-testid="makers-space"
      data-ground="grain-paper"
      className="makers-space"
      aria-label="Maker's space"
    >
      <div className="makers-space__shoe" data-testid="makers-space-mobile">
        {seats.map((photo, i) => {
          const seat = i + 1;
          const prioritize = seat === 1 || seat === 4;
          return (
            <button
              key={photo.id}
              type="button"
              data-testid="makers-seat"
              data-seat={seat}
              data-row={mobileRowForSeat(seat)}
              className={`makers-space__card makers-space__card--${seat}`}
              aria-label={`Open photo: ${photo.alt}`}
              onClick={() => setActive(photo)}
            >
              <WatermarkedImage
                src={photo.src}
                alt=""
                className="makers-space__img"
                wrapperClassName="relative block w-full"
                sizes="(max-width: 767px) 45vw, 18vw"
                loading={prioritize ? 'eager' : 'lazy'}
                fetchPriority={prioritize ? 'high' : 'auto'}
              />
            </button>
          );
        })}
      </div>

      {active && (
        <div
          className="makers-space__lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={active.alt}
          onClick={() => setActive(null)}
        >
          <button
            type="button"
            className="makers-space__lightbox-close"
            aria-label="Close"
            onClick={() => setActive(null)}
          >
            Close
          </button>
          <div className="makers-space__lightbox-frame" onClick={(e) => e.stopPropagation()}>
            <WatermarkedImage
              src={active.fullSrc}
              alt={active.alt}
              className="makers-space__lightbox-img"
              wrapperClassName="relative max-h-[85dvh] max-w-[92vw]"
              loading="eager"
              fetchPriority="high"
            />
          </div>
        </div>
      )}
    </section>
  );
}
