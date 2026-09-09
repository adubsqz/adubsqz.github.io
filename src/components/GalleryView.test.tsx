import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GalleryView from './GalleryView';
import { COLLECTIONS } from '../data';
import { HORIZONTAL_REEL_SIZE, VERTICAL_REEL_SIZE } from '../gallery-constants';
import { paginateByOrientation } from '../gallery-reel';
import {
  GALLERY_LOOKBOOK_CLASS,
  GALLERY_STILL_GAP_CLASS,
  GALLERY_STILL_INSET_CLASS,
  GALLERY_STILL_ITEM_CLASS,
} from '../gallery-layout';

const DEFAULT_FILTER = COLLECTIONS[0]?.id ?? 'greyscale';

describe('GalleryView', () => {
  it('mounts without throwing', () => {
    render(<GalleryView filter={DEFAULT_FILTER} />);
  });

  it('shows an empty-category message when the selected collection has no photos', () => {
    render(<GalleryView filter={DEFAULT_FILTER} />);
    const collection = COLLECTIONS.find((c) => c.id === DEFAULT_FILTER);
    if ((collection?.photos.length ?? 0) !== 0) return;
    expect(screen.getByText(/no photos found in this category/i)).toBeInTheDocument();
  });

  it('scrolls the full collection instead of paging', () => {
    render(<GalleryView filter={DEFAULT_FILTER} />);
    const collection = COLLECTIONS.find((c) => c.id === DEFAULT_FILTER)!;
    const imgs = screen.queryAllByRole('img').filter((el) => el.getAttribute('alt')?.startsWith('Photograph'));
    if (collection.photos.length === 0) {
      expect(imgs.length).toBe(0);
      return;
    }
    expect(imgs.length).toBe(collection.photos.length);
    expect(screen.queryByRole('button', { name: /next page/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /previous page/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/\d+ of \d+/)).not.toBeInTheDocument();
  });

  it('wraps the lookbook in even inset and stacks stills with matching gap', () => {
    const { container } = render(<GalleryView filter={DEFAULT_FILTER} />);
    const lookbook = container.querySelector('.gallery-lookbook');
    expect(lookbook).toBeTruthy();
    expect(lookbook?.className).toContain(GALLERY_STILL_INSET_CLASS.split(' ')[0]);
    expect(lookbook?.className.split(' ')).toEqual(expect.arrayContaining(['p-6', 'sm:p-10']));
    GALLERY_LOOKBOOK_CLASS.split(' ').forEach((cls) => {
      expect(lookbook?.className.split(' ')).toContain(cls);
    });
    const stack = container.querySelector('.gallery-still-stack');
    GALLERY_STILL_GAP_CLASS.split(' ').forEach((cls) => {
      expect(stack?.className.split(' ')).toContain(cls);
    });
    const stills = container.querySelectorAll('.gallery-still');
    expect(stills.length).toBeGreaterThan(0);
    stills.forEach((still) => {
      GALLERY_STILL_ITEM_CLASS.split(' ').forEach((cls) => {
        expect(still.className.split(' ')).toContain(cls);
      });
    });
  });

  it('scrolls every People still, with lookbook stills two and three in order', () => {
    const people = COLLECTIONS.find((c) => c.id === 'people');
    if (!people) return;
    render(<GalleryView filter="people" />);
    expect(screen.getAllByRole('button', { name: /open photo/i })).toHaveLength(people.photos.length);
    const srcs = screen.getAllByRole('img').map((el) => el.getAttribute('src') ?? '');
    expect(srcs[1]).toMatch(/sweetener-tour/);
    expect(srcs[2]).toMatch(/curls-night/);
    expect(srcs.join(' ')).not.toMatch(/camcorder-night/);
  });

  it('renders every still in the collection', () => {
    render(<GalleryView filter={DEFAULT_FILTER} />);
    const collection = COLLECTIONS.find((c) => c.id === DEFAULT_FILTER)!;
    if (collection.photos.length === 0) return;
    collection.photos.forEach((photo) => {
      expect(screen.getByAltText(photo.alt)).toBeInTheDocument();
    });
  });

  it('keeps even inset on the lightbox figure', async () => {
    const user = userEvent.setup();
    const { container } = render(<GalleryView filter={DEFAULT_FILTER} />);
    const clickTarget = container.querySelector('.absolute.inset-0.z-10');
    if (!clickTarget) return;
    await user.click(clickTarget);
    const dialog = screen.getByRole('dialog', { name: /image lightbox/i });
    const padded = dialog.querySelector('.mx-auto');
    expect(padded?.className.split(' ')).toEqual(expect.arrayContaining(['p-6', 'sm:p-10']));
  });

  it('opens lightbox when a photo is clicked', async () => {
    const user = userEvent.setup();
    const { container } = render(<GalleryView filter={DEFAULT_FILTER} />);
    const clickTarget = container.querySelector('.absolute.inset-0.z-10');
    if (!clickTarget) return;
    await user.click(clickTarget);
    const dialog = screen.getByRole('dialog', { name: /image lightbox/i });
    expect(dialog).toBeInTheDocument();
  });

  it('closes lightbox when Close is clicked', async () => {
    const user = userEvent.setup();
    const { container } = render(<GalleryView filter={DEFAULT_FILTER} />);
    const clickTarget = container.querySelector('.absolute.inset-0.z-10');
    if (!clickTarget) return;
    await user.click(clickTarget);
    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByRole('dialog', { name: /image lightbox/i })).not.toBeInTheDocument();
  });

  it('keyboard-navigates the lightbox and opens Contact Me only', async () => {
    const user = userEvent.setup();
    const { container } = render(<GalleryView filter={DEFAULT_FILTER} />);
    const clickTarget = container.querySelector('.absolute.inset-0.z-10');
    if (!clickTarget) return;
    await user.click(clickTarget);
    const lightbox = screen.getByRole('dialog', { name: /image lightbox/i });
    expect(lightbox).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /contact me/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /contact me/i }).className).toMatch(/mcm-brick/);
    expect(screen.queryByRole('button', { name: /request invoice/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /inquire about tearsheet/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/licensing & fulfillment/i)).not.toBeInTheDocument();
    await user.keyboard('{ArrowRight}');
    await user.keyboard('{ArrowLeft}');
    await user.click(screen.getByRole('button', { name: /contact me/i }));
    expect(await screen.findByRole('dialog', { name: /contact/i })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: /image lightbox/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/shipping address/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /submit inquiry/i })).not.toBeInTheDocument();
  });

  it('keeps purchase chrome off the enlarged photo', async () => {
    const user = userEvent.setup();
    const { container } = render(<GalleryView filter={DEFAULT_FILTER} />);
    const clickTarget = container.querySelector('.absolute.inset-0.z-10');
    if (!clickTarget) return;
    await user.click(clickTarget);
    expect(screen.getByRole('dialog', { name: /image lightbox/i })).toBeInTheDocument();
    expect(screen.queryByText(/request invoice/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/tearsheet/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/print inquiry/i)).not.toBeInTheDocument();
  });

  it('records a failed thumbnail without throwing', () => {
    const { container } = render(<GalleryView filter={DEFAULT_FILTER} />);
    const img = container.querySelector('img');
    if (!img) return;
    fireEvent.error(img);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders vertical stills and unknown filters', () => {
    const vertical = COLLECTIONS.find((c) => c.photos.some((p) => p.orientation === 'vertical'));
    if (vertical) {
      render(<GalleryView filter={vertical.id} />);
      expect(screen.getAllByRole('img').length).toBeGreaterThan(0);
    }
    render(<GalleryView filter="missing-category" />);
    expect(screen.getAllByRole('button', { name: /open photo/i }).length).toBeGreaterThan(0);
  });

  it('eager-loads the first still so LCP is not lazy', () => {
    const collection = COLLECTIONS.find((c) => c.id === DEFAULT_FILTER);
    if (!collection || collection.photos.length === 0) return;
    const { container } = render(<GalleryView filter={DEFAULT_FILTER} />);
    const first = screen.getAllByRole('img').find((el) => el.getAttribute('src')?.includes('still-life'));
    expect(first).toBeDefined();
    expect(first).toHaveAttribute('loading', 'eager');
    expect(first).toHaveAttribute('fetchpriority', 'high');
    expect(first).toHaveAttribute('width');
    expect(first).toHaveAttribute('height');
    const lazy = screen.getAllByRole('img').filter((el) => el.getAttribute('loading') === 'lazy');
    expect(lazy.length).toBe(Math.max(0, collection.photos.length - 1));
    const stills = container.querySelectorAll('.gallery-still');
    expect(stills[0]?.className).not.toContain('content-visibility:auto');
    if (stills.length > 1) {
      expect(stills[1]?.className).toContain('content-visibility:auto');
    }
  });
});

describe('GalleryView regression: orientation helpers', () => {
  it('never mixes orientations on a single helper page', () => {
    COLLECTIONS.forEach((collection) => {
      paginateByOrientation(collection.photos).forEach((page) => {
        const orientations = new Set(page.photos.map((p) => p.orientation ?? 'horizontal'));
        expect(orientations.size).toBe(1);
      });
    });
  });

  it('respects horizontal and vertical page caps in the helper', () => {
    COLLECTIONS.forEach((collection) => {
      paginateByOrientation(collection.photos).forEach((page) => {
        const cap = page.orientation === 'vertical' ? VERTICAL_REEL_SIZE : HORIZONTAL_REEL_SIZE;
        expect(page.photos.length).toBeLessThanOrEqual(cap);
      });
    });
  });
});
