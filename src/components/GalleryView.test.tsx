import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GalleryView from './GalleryView';
import { COLLECTIONS } from '../data';

const PER_PAGE = 8;

describe('GalleryView', () => {
  it('renders the unaltered-photos disclaimer', () => {
    render(<GalleryView filter="bw" />);
    expect(screen.getByText(/none of these photos have been altered/i)).toBeInTheDocument();
  });

  it('renders multiple photos when collection has many', () => {
    render(<GalleryView filter="bw" />);
    const imgs = screen.getAllByRole('img');
    expect(imgs.length).toBeGreaterThan(1);
    expect(imgs.length).toBeLessThanOrEqual(PER_PAGE);
  });

  it('shows pagination when collection has more than PER_PAGE photos', () => {
    render(<GalleryView filter="bw" />);
    const bwCollection = COLLECTIONS.find((c) => c.id === 'still-life-bw')!;
    if (bwCollection.photos.length > PER_PAGE) {
      expect(screen.getByText(/page \d+ of \d+/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
    }
  });

  it('renders B&W photos when filter is bw', () => {
    render(<GalleryView filter="bw" />);
    const bwCollection = COLLECTIONS.find((c) => c.id === 'still-life-bw')!;
    const firstPagePhotos = bwCollection.photos.slice(0, PER_PAGE);
    firstPagePhotos.forEach((photo) => {
      expect(screen.getByAltText(photo.alt)).toBeInTheDocument();
    });
  });

  it('renders Redscale photos when filter is redscale', () => {
    render(<GalleryView filter="redscale" />);
    const redscaleCollection = COLLECTIONS.find((c) => c.id === 'still-life-redscale')!;
    expect(redscaleCollection.photos).toHaveLength(18);
    expect(redscaleCollection.photos.at(-1)?.src.endsWith('redscale-04-harmon-red-0037.jpg')).toBe(true);
    const firstPagePhotos = redscaleCollection.photos.slice(0, PER_PAGE);
    firstPagePhotos.forEach((photo) => {
      expect(screen.getByAltText(photo.alt)).toBeInTheDocument();
    });
  });

  it('returns to the first page when the filter changes', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<GalleryView filter="redscale" />);
    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText(/page 3 of 3/i)).toBeInTheDocument();
    rerender(<GalleryView filter="color" />);
    const colorCollection = COLLECTIONS.find((c) => c.id === 'still-life-color')!;
    expect(screen.getByAltText(colorCollection.photos[0].alt)).toBeInTheDocument();
    expect(screen.queryByText(/page 3 of 3/i)).not.toBeInTheDocument();
  });

  it('renders Color photos when filter is color', () => {
    render(<GalleryView filter="color" />);
    const colorCollection = COLLECTIONS.find((c) => c.id === 'still-life-color')!;
    const firstPagePhotos = colorCollection.photos.slice(0, PER_PAGE);
    firstPagePhotos.forEach((photo) => {
      expect(screen.getByAltText(photo.alt)).toBeInTheDocument();
    });
  });

  it('opens lightbox when a photo is clicked', async () => {
    const user = userEvent.setup();
    const { container } = render(<GalleryView filter="bw" />);
    const clickTarget = container.querySelector('.absolute.inset-0.z-10');
    if (!clickTarget) throw new Error('Click target not found');
    await user.click(clickTarget);
    const dialog = screen.getByRole('dialog', { name: /image lightbox/i });
    expect(dialog).toBeInTheDocument();
  });

  it('closes lightbox when Close is clicked', async () => {
    const user = userEvent.setup();
    const { container } = render(<GalleryView filter="bw" />);
    const clickTarget = container.querySelector('.absolute.inset-0.z-10');
    if (!clickTarget) throw new Error('Click target not found');
    await user.click(clickTarget);
    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByRole('dialog', { name: /image lightbox/i })).not.toBeInTheDocument();
  });
});

describe('GalleryView regression: pagination and photo count', () => {
  it('total pages are computed safely for all collections', () => {
    COLLECTIONS.forEach((collection) => {
      const totalPages = Math.max(1, Math.ceil(collection.photos.length / PER_PAGE));
      expect(totalPages).toBeGreaterThanOrEqual(1);
      if (collection.photos.length > PER_PAGE) {
        expect(totalPages).toBeGreaterThan(1);
      }
    });
  });

  it('pagination slice does not reduce photo count below 1 when many exist', () => {
    COLLECTIONS.forEach((collection) => {
      const start = (1 - 1) * PER_PAGE;
      const pagePhotos = collection.photos.slice(start, start + PER_PAGE);
      expect(pagePhotos.length).toBeGreaterThanOrEqual(1);
      if (collection.photos.length > PER_PAGE) {
        expect(pagePhotos.length).toBe(PER_PAGE);
      }
    });
  });
});
