import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GalleryView from './GalleryView';
import { COLLECTIONS } from '../data';
import { CONTACT_SHEET_INITIAL_THUMBS, GALLERY_LIGHTBOX_PAD_CLASS } from '../gallery-layout';

const allPhotos = COLLECTIONS.flatMap((collection) => collection.photos);

describe('GalleryView', () => {
  it('mounts a single contact sheet of every published still', () => {
    render(<GalleryView />);
    if (allPhotos.length === 0) {
      expect(screen.getByText(/no photos yet/i)).toBeInTheDocument();
      return;
    }
    expect(screen.getAllByRole('button', { name: /select photo/i })).toHaveLength(allPhotos.length);
    expect(screen.getAllByRole('button', { name: /open photo/i })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /next page/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/\d+ of \d+/)).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: /collections/i })).not.toBeInTheDocument();
  });

  it('keeps color and people frames on the same sheet', () => {
    render(<GalleryView />);
    const labels = screen.getAllByRole('button', { name: /select photo/i }).map((el) => el.getAttribute('aria-label') ?? '');
    const joined = labels.join(' ');
    expect(joined).toMatch(/hospitalwindows|Photograph/i);
    const srcs = allPhotos.map((photo) => photo.src).join(' ');
    expect(srcs).toMatch(/hospitalwindows/);
    expect(srcs).toMatch(/sangerhall/);
    expect(srcs).toMatch(/sweetener-tour/);
    expect(srcs).toMatch(/camcorder-night/);
  });

  it('selects a thumb without opening the frame', async () => {
    if (allPhotos.length < 2) return;
    const user = userEvent.setup();
    render(<GalleryView />);
    const next = screen.getAllByRole('button', { name: /select photo/i })[1];
    await user.click(next);
    expect(next).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('dialog', { name: /image lightbox/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: `Open photo: ${allPhotos[1].alt}` })).toBeInTheDocument();
  });

  it('opens the lightbox from the large frame, with white margin around the invoice', async () => {
    const user = userEvent.setup();
    render(<GalleryView />);
    if (allPhotos.length === 0) return;
    await user.click(screen.getByRole('button', { name: /open photo/i }));
    const dialog = screen.getByRole('dialog', { name: /image lightbox/i });
    expect(dialog).toHaveClass('bg-white');
    const stage = dialog.querySelector('.lightbox-stage');
    GALLERY_LIGHTBOX_PAD_CLASS.split(' ').forEach((cls) => {
      expect(stage?.className.split(' ')).toContain(cls);
    });
    expect(screen.getByRole('button', { name: /request invoice/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /request invoice/i }).className).toMatch(/bg-neutral-950/);
  });

  it('closes lightbox when Close is clicked', async () => {
    const user = userEvent.setup();
    render(<GalleryView />);
    if (allPhotos.length === 0) return;
    await user.click(screen.getByRole('button', { name: /open photo/i }));
    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByRole('dialog', { name: /image lightbox/i })).not.toBeInTheDocument();
  });

  it('keyboard-navigates the lightbox and opens Request Invoice', async () => {
    const user = userEvent.setup();
    render(<GalleryView />);
    if (allPhotos.length === 0) return;
    await user.click(screen.getByRole('button', { name: /open photo/i }));
    expect(screen.getByRole('button', { name: /licensing or hire/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /contact me/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/stripe/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /checkout/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add to cart/i })).not.toBeInTheDocument();
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
    await user.click(screen.getByRole('button', { name: /open photo/i }));
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

  it('eager-loads the hero and defers the rest of the strip', () => {
    if (allPhotos.length === 0) return;
    const { container } = render(<GalleryView />);
    const hero = screen.getByRole('img', { name: allPhotos[0].alt });
    expect(hero).toHaveAttribute('loading', 'eager');
    expect(hero).toHaveAttribute('fetchpriority', 'high');
    const lazy = container.querySelectorAll('img[loading="lazy"]');
    const painted = Math.min(CONTACT_SHEET_INITIAL_THUMBS, allPhotos.length);
    expect(lazy.length).toBeGreaterThanOrEqual(painted);
    expect(lazy.length).toBeLessThanOrEqual(allPhotos.length);
    expect(screen.getAllByRole('button', { name: /select photo/i })).toHaveLength(allPhotos.length);
  });
});
