export type PageView = 'gallery' | 'about';

export interface Photo {
  id: string;
  /** Full web publish JPEG (lightbox / invoice). */
  src: string;
  /** Small contact-sheet JPEG when published; falls back to `src` in the UI. */
  sheetSrc?: string;
  alt: string;
  caption?: string;
  orientation?: 'horizontal' | 'vertical' | 'square';
  /** Original scan width in pixels (not the published web JPEG). */
  masterWidth?: number;
  /** Original scan height in pixels (not the published web JPEG). */
  masterHeight?: number;
}

export interface PhotoCollection {
  id: string;
  title: string;
  description?: string;
  photos: Photo[];
}
