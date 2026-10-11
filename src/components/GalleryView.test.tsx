import { describe, it, expect, vi, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GalleryView from './GalleryView';
import { COLLECTIONS } from '../data';
import { CONTACT_SHEET_EAGER_FRAMES, GALLERY_LIGHTBOX_PAD_CLASS } from '../gallery-layout';

const allPhotos = COLLECTIONS.flatMap((collection) => collection.photos);
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
    expect(screen.queryByText('KODAK')).not.toBeInTheDocument();
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

  it('shuffles the sheet on each mount', () => {
    if (allPhotos.length < 2) return;
    vi.spyOn(Math, 'random').mockReturnValue(0);
    render(<GalleryView />);
    const first = screen.getAllByRole('button', { name: /open photo/i })[0];
    expect(first).not.toHaveAccessibleName(`Open photo: ${allPhotos[0].alt}`);
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
    const painted = Math.min(CONTACT_SHEET_EAGER_FRAMES, allPhotos.length);
    expect(eager).toHaveLength(painted);
    expect(lazy).toHaveLength(allPhotos.length - painted);
    expect(eager[0]).toHaveAttribute('fetchpriority', 'high');
  });
});
