import { ABOUT } from '../data';
import { Button } from './ui/button';
import { RightsReservedBlock } from './LicensingDetails';

interface AboutViewProps {
  onContactClick?: () => void;
}

export default function AboutView({ onContactClick }: AboutViewProps) {
  return (
    <div className="mx-auto max-w-2xl space-y-8 sm:space-y-12">
      <p className="font-display text-[1.55rem] leading-[1.4] text-photo-fg sm:text-4xl sm:leading-[1.3]">
        {ABOUT.voice}
      </p>
      <p className="text-base leading-relaxed text-photo-muted sm:text-lg">{ABOUT.portfolioPitch}</p>

      <div className="flex flex-col gap-4 border-t border-mcm-line/80 pt-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
        <p className="max-w-md text-base leading-snug text-photo-fg/85">
          Need prints, a license, or a site? One message. No funnel.
        </p>
        <Button
          type="button"
          onClick={onContactClick}
          className="h-12 shrink-0 rounded-xl px-7 text-base font-medium shadow-none"
        >
          Let&apos;s talk
        </Button>
      </div>

      <RightsReservedBlock plain />
    </div>
  );
}
