import { ABOUT } from '../data';
import { SITE_HOST, SITE_ORIGIN } from '../site';
import GraffitiLabel from './GraffitiLabel';
import { RightsReservedBlock } from './LicensingDetails';

interface AboutViewProps {
  onContactClick?: () => void;
}

const instagram = ABOUT.socials.find((social) => social.name === 'Instagram');

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
        <div className="flex shrink-0 flex-col gap-1 sm:items-end">
          <h3 className="graffiti-heading graffiti-heading--h3">
            <button type="button" onClick={onContactClick} className="graffiti-nav min-h-11">
              <GraffitiLabel text="let's talk" on tone="pink" />
            </button>
          </h3>
          {instagram ? (
            <a
              href={instagram.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center text-base font-medium text-mcm-brick hover:underline"
            >
              Instagram
            </a>
          ) : null}
          <a
            href={SITE_ORIGIN}
            className="inline-flex min-h-11 items-center text-sm text-photo-muted hover:text-mcm-brick hover:underline"
          >
            {SITE_HOST}
          </a>
        </div>
      </div>

      <RightsReservedBlock plain />
    </div>
  );
}
