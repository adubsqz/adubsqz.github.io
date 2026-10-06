export type PageView = 'gallery' | 'about';
export type GalleryFilter = 'bw' | 'color' | 'redscale';

export interface Photo {
  id: string;
  src: string;
  alt: string;
  caption?: string;
  orientation?: 'horizontal' | 'vertical' | 'square';
}

export interface PhotoCollection {
  id: string;
  title: string;
  description?: string;
  photos: Photo[];
}
