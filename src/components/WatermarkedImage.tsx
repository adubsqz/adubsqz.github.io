import { useState } from 'react';

interface WatermarkedImageProps {
  src: string;
  alt: string;
  /** Classes for the outer wrapper (default full-width; use `max-w-full w-fit` to hug image aspect ratio) */
  wrapperClassName?: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  decoding?: 'async' | 'sync' | 'auto';
  /** Hint LCP / visible-row priority (passed through to `<img>`) */
  fetchPriority?: 'high' | 'low' | 'auto';
  /** Responsive decode hint for gallery JPEGs (publish max ~2400px). */
  sizes?: string;
  width?: number;
  height?: number;
  onError?: () => void;
  onClick?: () => void;
  watermarkText?: string;
  watermarkOpacity?: number;
}

/**
 * Protected image component with drag/download prevention
 * Images have embedded watermarks (added during optimization)
 * Plus a diagonal overlay watermark (readable at thumbnail scale; still non-destructive).
 */
export default function WatermarkedImage({
  src,
  alt,
  wrapperClassName = 'relative inline-block w-full',
  className = '',
  loading = 'lazy',
  decoding = 'async',
  fetchPriority,
  sizes = '(max-width: 768px) 96vw, (max-width: 1280px) 80vw, 1240px',
  width,
  height,
  onError,
  onClick,
  watermarkText = 'adubsqz',
  /** 0–1 CSS opacity on the overlay spans; keep in sync with gallery contrast needs */
  watermarkOpacity = 0.3,
}: WatermarkedImageProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  return (
    <div
      className={wrapperClassName}
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {/* Transparent overlay to prevent drag-and-drop */}
      <div
        className="absolute inset-0 z-10"
        style={{ cursor: onClick ? 'pointer' : 'default' }}
        onClick={onClick}
      />
      
      {/* Main Image - Watermark is embedded in the image file itself */}
      <img
        src={src}
        alt={alt}
        className={className}
        loading={loading}
        decoding={decoding}
        fetchPriority={fetchPriority}
        sizes={sizes}
        width={width}
        height={height}
        onError={onError}
        onLoad={handleImageLoad}
        style={{
          userSelect: 'none',
          WebkitUserSelect: 'none',
          pointerEvents: 'none',
        }}
        draggable="false"
      />

      {/* One diagonal watermark plus one bottom-right signature */}
      {imageLoaded && (
        <div className="absolute inset-0 z-20 overflow-hidden pointer-events-none" aria-hidden="true">
          <span
            className="absolute left-1/2 top-1/2"
            style={{
              transform: 'translate(-50%, -50%) rotate(-24deg)',
              opacity: watermarkOpacity,
              fontSize: 'clamp(1.1rem, 3vw, 2.25rem)',
              fontWeight: 700,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              userSelect: 'none',
              pointerEvents: 'none',
              color: '#ffffff',
              textShadow:
                '0 1px 2px rgba(0, 0, 0, 0.65), 0 0 12px rgba(0, 0, 0, 0.35)',
              whiteSpace: 'nowrap',
            }}
          >
            {watermarkText}
          </span>
          <span
            className="absolute right-3 bottom-2"
            style={{
              opacity: Math.min(watermarkOpacity + 0.08, 0.5),
              fontSize: 'clamp(0.72rem, 1.1vw, 0.92rem)',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'lowercase',
              userSelect: 'none',
              pointerEvents: 'none',
              color: '#ffffff',
              textShadow: '0 1px 3px rgba(0, 0, 0, 0.55)',
              whiteSpace: 'nowrap',
            }}
          >
            © {watermarkText}
          </span>
        </div>
      )}
    </div>
  );
}
