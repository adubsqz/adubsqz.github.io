interface BrandMarkProps {
  onClick?: () => void;
  /** Hero-scale mark for the password curtain; default is header size. */
  size?: 'header' | 'hero';
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

  const className = [
    'brand-mark',
    size === 'hero' ? 'brand-mark--hero' : '',
    onLight ? 'brand-mark--on-light' : '',
  ]
    .filter(Boolean)
    .join(' ');

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
