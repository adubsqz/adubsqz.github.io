interface BrandMarkProps {
  onClick?: () => void;
}

export default function BrandMark({ onClick }: BrandMarkProps) {
  const mark = 'adubsqz';

  return (
    <h1 className="brand-mark">
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
