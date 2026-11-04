interface BrandMarkProps {
  onClick?: () => void;
  /** Hero-scale mark for the password curtain; default is header size. */
  size?: 'header' | 'hero';
}

export default function BrandMark({ onClick, size = 'header' }: BrandMarkProps) {
  const mark = 'adubsqz';

  return (
    <h1 className={size === 'hero' ? 'brand-mark brand-mark--hero' : 'brand-mark'}>
      {onClick ? (
        <button type="button" className="brand-mark__hit" onClick={onClick}>
          {mark}
        </button>
      ) : (
        mark
      )}
    </h1>
  );
}
