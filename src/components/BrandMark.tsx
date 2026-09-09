import GraffitiLabel from './GraffitiLabel';

interface BrandMarkProps {
  onClick?: () => void;
  pressed?: boolean;
}

export default function BrandMark({ onClick, pressed = false }: BrandMarkProps) {
  const mark = <GraffitiLabel text="adubsqz" on tone="pink" />;

  return (
    <h1 className="brand-mark">
      {onClick ? (
        <button
          type="button"
          id="tab-about"
          className="graffiti-nav brand-mark__hit"
          aria-pressed={pressed}
          aria-controls="panel-about"
          onClick={onClick}
        >
          {mark}
        </button>
      ) : (
        mark
      )}
    </h1>
  );
}
