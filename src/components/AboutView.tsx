import { ABOUT, ABOUT_IMAGE_SRC } from '../data';
import { SITE_HOST, SITE_ORIGIN } from '../site';
import BrandMark from './BrandMark';
import { RightsReservedBlock } from './LicensingDetails';
import WatermarkedImage from './WatermarkedImage';

interface AboutViewProps {
  onContactClick?: () => void;
}

const instagram = ABOUT.socials.find((social) => social.name === 'Instagram');

export default function AboutView({ onContactClick }: AboutViewProps) {
  return (
    <div className="about-on-grain space-y-10 sm:space-y-14" data-testid="about-view">
      <div className="about-layout">
        <div className="about-mark" data-testid="about-xl-logo">
          <BrandMark size="about" ground="light" />
        </div>

        <div className="space-y-8 sm:space-y-10">
          {ABOUT_IMAGE_SRC ? (
            <figure className="proof-plate space-y-3">
              <WatermarkedImage
                src={ABOUT_IMAGE_SRC}
                alt={ABOUT.photoCredit || 'Portrait of the photographer'}
                wrapperClassName="proof-plate__frame relative w-full overflow-hidden"
                className="max-h-[min(70vh,44rem)] w-full object-contain object-center"
                loading="eager"
                watermarkOpacity={0.08}
              />
              <figcaption className="grease-pencil grease-pencil--on-ink px-0.5">
                {ABOUT.photoCredit || 'Portrait of the photographer'}
                <span aria-hidden="true"> · </span>
                NYC proof
              </figcaption>
            </figure>
          ) : null}

          <div className="space-y-3">
            <p className="font-display text-[1.55rem] leading-[1.4] text-photo-fg sm:text-4xl sm:leading-[1.3]">
              {ABOUT.voice}
            </p>
          </div>

          <div className="space-y-3 border-t border-photo-fg/15 pt-6">
            <p className="text-base leading-relaxed text-photo-muted sm:text-lg">{ABOUT.portfolioPitch}</p>
          </div>

          <div className="flex flex-col gap-4 border-t border-photo-fg/15 pt-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
            <p className="max-w-md text-base leading-snug text-photo-fg">
              Need a print, a license, or a site built around your work? One message.
            </p>
            <div className="flex shrink-0 flex-col gap-1 sm:items-end">
              <button
                type="button"
                onClick={onContactClick}
                className="min-h-11 text-left text-base text-photo-fg underline underline-offset-4"
              >
                let&apos;s talk
              </button>
              {instagram ? (
                <a
                  href={instagram.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center text-base text-photo-muted underline-offset-4 hover:text-photo-fg hover:underline"
                >
                  Instagram
                </a>
              ) : null}
              <a
                href={SITE_ORIGIN}
                className="inline-flex min-h-11 items-center text-sm text-photo-muted/80 underline-offset-4 hover:text-photo-fg hover:underline"
              >
                {SITE_HOST}
              </a>
            </div>
          </div>

          <RightsReservedBlock plain className="text-photo-muted [&_a]:text-photo-fg/70" />
        </div>
      </div>
    </div>
  );
}
