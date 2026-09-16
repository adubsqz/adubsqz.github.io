export type PageView = 'gallery' | 'about';
export type GalleryFilter = string;

export interface Photo {
  id: string;
  src: string;
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
