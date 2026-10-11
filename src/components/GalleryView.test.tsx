import { describe, it, expect, vi, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GalleryView from './GalleryView';
import { COLLECTIONS } from '../data';
import {
  CONTACT_SHEET_EAGER_FRAMES,
  GALLERY_LIGHTBOX_PAD_CLASS,
  contactSheetEagerFrameCount,
} from '../gallery-layout';
import { arrangeContactSheet } from '../gallery-sheet-order';

const allPhotos = COLLECTIONS.flatMap((collection) => collection.photos);
const sheetOrder = arrangeContactSheet(COLLECTIONS);
const eagerForJsdom = () =>
  typeof window !== 'undefined'
    ? contactSheetEagerFrameCount(window.innerWidth)
    : CONTACT_SHEET_EAGER_FRAMES;
const CATEGORY_LABEL = /Photograph (bw|color|redscale|people|greyscale|portraits) /i;

describe('GalleryView', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('mounts every published still as its own frame, with no category labels', () => {
    render(<GalleryView />);
    if (allPhotos.length === 0) {
      expect(screen.getByText(/no photos yet/i)).toBeInTheDocument();
      return;
    }
    const frames = screen.getAllByRole('button', { name: /open photo/i });
    expect(frames).toHaveLength(allPhotos.length);
    expect(screen.queryByRole('button', { name: /select photo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: /collections/i })).not.toBeInTheDocument();
    frames.forEach((frame) => {
      expect(frame.getAttribute('aria-label') ?? '').not.toMatch(CATEGORY_LABEL);
    });
    expect(document.querySelectorAll('.contact-frame')).toHaveLength(allPhotos.length);
    expect(document.querySelectorAll('.film-strip').length).toBeGreaterThan(1);
    expect(document.querySelectorAll('.film-sprockets').length).toBeGreaterThan(0);
    expect(screen.queryByText('KODAK', { exact: true })).not.toBeInTheDocument();
    const names = [...document.querySelectorAll('.film-frame-name')].map((el) => el.textContent ?? '');
    expect(names.some((name) => name.length > 0)).toBe(true);
    names.forEach((name) => {
      expect(name).not.toMatch(/^Photograph\b/i);
      expect(name).not.toMatch(/^(bw|color|redscale|people|greyscale|portraits)$/i);
    });
    expect(document.querySelector('.contact-thumbs')).toBeNull();
  });

  it('keeps color and people frames on the same sheet', () => {
    render(<GalleryView />);
    const labels = screen.getAllByRole('button', { name: /open photo/i }).map((el) => el.getAttribute('aria-label') ?? '');
    const joined = labels.join(' ');
    expect(joined).toMatch(/hospitalwindows/);
    expect(joined).toMatch(/sangerhall/);
    expect(joined).toMatch(/sweetener-tour/);
    expect(joined).toMatch(/camcorder-night/);
  });

  it('keeps the same aesthetic sheet order on every mount', () => {
    if (sheetOrder.length < 2) return;
    render(<GalleryView />);
    const labels = screen.getAllByRole('button', { name: /open photo/i }).map(
      (el) => el.getAttribute('aria-label') ?? '',
    );
    expect(labels).toEqual(sheetOrder.map((photo) => `Open photo: ${photo.alt}`));
    expect(labels[0]).not.toBe(`Open photo: ${allPhotos[0]?.alt}`);
  });

  it('preloads the first eager strip for a stable LCP path', async () => {
    if (sheetOrder.length === 0) return;
    render(<GalleryView />);
    const painted = Math.min(eagerForJsdom(), sheetOrder.length);
    const expected = sheetOrder
      .slice(0, painted)
      .map((photo) => photo.sheetSrc ?? photo.src);
    await waitFor(() => {
      const preloads = [...document.head.querySelectorAll('link[rel="preload"][as="image"]')];
      expect(preloads.map((link) => link.getAttribute('href'))).toEqual(expected);
      expect(preloads[0]?.getAttribute('fetchpriority')).toBe('high');
    });
  });

  it('opens a standalone frame with room for Request Invoice', async () => {
    const user = userEvent.setup();
    render(<GalleryView />);
    if (allPhotos.length === 0) return;
    await user.click(screen.getAllByRole('button', { name: /open photo/i })[0]);
    const dialog = screen.getByRole('dialog', { name: /image lightbox/i });
    expect(dialog).toHaveClass('bg-white');
    const stage = dialog.querySelector('.lightbox-stage');
    GALLERY_LIGHTBOX_PAD_CLASS.split(' ').forEach((cls) => {
      expect(stage?.className.split(' ')).toContain(cls);
    });
    expect(screen.getByRole('button', { name: /request invoice/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /request invoice/i }).className).toMatch(/bg-neutral-950/);
    expect(screen.getAllByRole('button', { name: /open photo/i }).length).toBe(allPhotos.length);
  });

  it('closes lightbox when Close is clicked', async () => {
    const user = userEvent.setup();
    render(<GalleryView />);
    if (allPhotos.length === 0) return;
    await user.click(screen.getAllByRole('button', { name: /open photo/i })[0]);
    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByRole('dialog', { name: /image lightbox/i })).not.toBeInTheDocument();
  });

  it('keyboard-navigates the lightbox and opens Request Invoice', async () => {
    const user = userEvent.setup();
    render(<GalleryView />);
    if (allPhotos.length === 0) return;
    await user.click(screen.getAllByRole('button', { name: /open photo/i })[0]);
    expect(screen.getByRole('button', { name: /licensing or hire/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /contact me/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/stripe/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/tearsheet/i)).not.toBeInTheDocument();
    await user.keyboard('{ArrowRight}');
    await user.keyboard('{ArrowLeft}');
    await user.click(screen.getByRole('button', { name: /request invoice/i }));
    expect(await screen.findByRole('dialog', { name: /request invoice/i })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: /image lightbox/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/shipping address/i)).toBeInTheDocument();
  });

  it('opens ContactModal from Licensing or hire', async () => {
    const user = userEvent.setup();
    render(<GalleryView />);
    if (allPhotos.length === 0) return;
    await user.click(screen.getAllByRole('button', { name: /open photo/i })[0]);
    await user.click(screen.getByRole('button', { name: /licensing or hire/i }));
    expect(await screen.findByRole('dialog', { name: /contact/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/shipping address/i)).not.toBeInTheDocument();
  });

  it('records a failed frame without throwing', () => {
    const { container } = render(<GalleryView />);
    const img = container.querySelector('img');
    if (!img) return;
    fireEvent.error(img);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('eager-loads the first row and lazy-loads the rest', () => {
    if (allPhotos.length === 0) return;
    const { container } = render(<GalleryView />);
    const eager = container.querySelectorAll('img[loading="eager"]');
    const lazy = container.querySelectorAll('img[loading="lazy"]');
    const painted = Math.min(eagerForJsdom(), allPhotos.length);
    expect(eager).toHaveLength(painted);
    expect(lazy).toHaveLength(allPhotos.length - painted);
    expect(eager[0]).toHaveAttribute('fetchpriority', 'high');
    expect(eager[0]?.getAttribute('src')).toMatch(/\/photos\/sheet\//);
  });

  it('keeps off-strip frames without a src until they intersect the film roll', () => {
    const painted = eagerForJsdom();
    if (allPhotos.length <= painted) return;

    class DeferredIntersectionObserver {
      static instances: DeferredIntersectionObserver[] = [];
      callback: IntersectionObserverCallback;
      constructor(callback: IntersectionObserverCallback) {
        this.callback = callback;
        DeferredIntersectionObserver.instances.push(this);
      }
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords(): IntersectionObserverEntry[] {
        return [];
      }
      readonly root = null;
      readonly rootMargin = '';
      readonly thresholds: number[] = [];
    }

    DeferredIntersectionObserver.instances = [];
    vi.stubGlobal('IntersectionObserver', DeferredIntersectionObserver);

    const { container } = render(<GalleryView />);
    const imgs = container.querySelectorAll('img.gallery-image');
    expect(imgs).toHaveLength(painted);
    expect(container.querySelectorAll('.contact-frame-fallback[aria-hidden="true"]').length).toBe(
      allPhotos.length - painted,
    );
  });
});

