/**
 * Shared licensing / fulfillment copy for inquiry and contact flows
 * (gallery browsing stays minimal; details appear when someone initiates purchase or outreach).
 */
import { SITE_HOST, SITE_ORIGIN } from '../site';
import { Card } from './ui/card';

export function FilmTvClearanceBlock({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-photo-accent/35 bg-photo-accent/10 p-4 sm:p-5 space-y-2 ${className}`}
    >
      <p className="text-[0.72rem] font-medium tracking-wide text-photo-accent">
        Film + TV Clearance Guarantee
      </p>
      <p className="text-sm sm:text-base text-photo-fg leading-relaxed">
        All photography is 100% owned, unencumbered, and pre-cleared for Film, Television, and
        Commercial broadcast.
      </p>
    </div>
  );
}

export function RightsReservedBlock({
  className = '',
  plain = false,
}: {
  className?: string;
  plain?: boolean;
}) {
  if (plain) {
    return (
      <div className={`space-y-1.5 ${className}`}>
        <p className="text-[0.7rem] font-medium tracking-wide text-photo-muted/70">
          Rights reserved
        </p>
        <p className="max-w-3xl text-[0.65rem] leading-relaxed text-photo-muted/60">
          All photographs, site design, source code, written content, and metadata are copyright © 2026
          Alexander Ames. No copying, redistribution, scraping, or derivative use without prior written
          permission.{' '}
          <a href={SITE_ORIGIN} className="hover:underline">
            {SITE_HOST}
          </a>
        </p>
      </div>
    );
  }

  return (
    <Card className={`p-4 space-y-2 ${className}`}>
      <p className="text-[0.72rem] font-medium tracking-wide text-photo-muted">
        Rights Reserved
      </p>
      <p className="text-xs sm:text-sm text-photo-fg/90 leading-relaxed">
        All photographs, site design, source code, written content, and metadata are copyright © 2026 Alexander Ames.
        No copying, redistribution, scraping, dataset inclusion, AI/ML training, indexing, embedding, or derivative use
        is permitted without prior written permission.{' '}
        <a href={SITE_ORIGIN} className="hover:underline">
          {SITE_HOST}
        </a>
      </p>
    </Card>
  );
}

type TearsheetSurface = 'modal' | 'default';

export function TearsheetAndFulfillmentGrid({
  surface = 'default',
  className = '',
}: {
  surface?: TearsheetSurface;
  className?: string;
}) {
  const card =
    surface === 'modal'
      ? 'rounded-xl bg-photo-bg/50 p-3 space-y-1.5'
      : 'rounded-xl p-4 space-y-2';

  return (
    <div className={`grid gap-4 md:grid-cols-2 ${className}`}>
      <Card className={card}>
        <p className="text-[0.72rem] font-medium tracking-wide text-photo-muted">Trade Portal + Tearsheet</p>
        <p className="text-xs sm:text-sm text-photo-fg/90 leading-relaxed">
          Printable 8.5×11 lookbook pages with image SKU and title under each frame—available on request; say you’re
          interested in the tearsheet when you reach out.
        </p>
      </Card>
      <Card className={card}>
        <p className="text-[0.72rem] font-medium tracking-wide text-photo-muted">Fulfillment + licensing</p>
        <p className="text-xs sm:text-sm text-photo-fg/90 leading-relaxed">
          Digital licensing: typically within 24 hours of cleared contract. Framed print production: 3-5 business
          days. Ready-to-hang NYC/NJ delivery: 5-7 business days.
        </p>
        <p className="text-xs sm:text-sm text-photo-fg/90 leading-relaxed">
          Short-term set rental is available at 20% of retail per 30-day term. Final terms are set privately by
          contract.
        </p>
      </Card>
    </div>
  );
}
