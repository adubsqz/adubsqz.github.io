interface BrandMarkProps {
  onClick?: () => void;
  /** Hero = gate; about = XL plate on the About grain page; default = header. */
  size?: 'header' | 'hero' | 'about';
  /**
   * Dark ground → white mark; light ground → black mark.
   * Default dark matches the lookbook ink / gate.
   */
  ground?: 'dark' | 'light';
}

const BLACK_SRC = '/adubsqz_logo_black.png';
const WHITE_SRC = '/adubsqz_logo_white.png';

export default function BrandMark({
  onClick,
  size = 'header',
  ground = 'dark',
}: BrandMarkProps) {
  const onLight = ground === 'light';
  const mark = (
    <span className="brand-mark__stack">
      <img
        className="brand-mark__img brand-mark__img--white"
        src={WHITE_SRC}
        alt={onLight ? '' : 'adubsqz'}
        width={1024}
        height={254}
        decoding="async"
      />
      <img
        className="brand-mark__img brand-mark__img--black"
        src={BLACK_SRC}
        alt={onLight ? 'adubsqz' : ''}
        width={1024}
        height={254}
        decoding="async"
      />
    </span>
  );

  const sizeClass =
    size === 'hero' ? 'brand-mark--hero' : size === 'about' ? 'brand-mark--about' : '';

  const className = ['brand-mark', sizeClass, onLight ? 'brand-mark--on-light' : '']
    .filter(Boolean)
    .join(' ');

  // About XL mark is decorative — the header already exposes the site name.
  if (size === 'about') {
    return (
      <div className={className} aria-hidden="true">
        {mark}
      </div>
    );
  }

  return (
    <h1 className={className}>
      {onClick ? (
        <button type="button" className="brand-mark__hit" onClick={onClick} aria-label="adubsqz">
          {mark}
        </button>
      ) : (
        mark
      )}
    </h1>
  );
}
