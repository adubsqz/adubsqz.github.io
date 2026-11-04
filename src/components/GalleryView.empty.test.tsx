import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../data', () => ({
  COLLECTIONS: [{ id: 'greyscale', title: 'Greyscale', photos: [] }],
}));

import GalleryView from './GalleryView';

describe('GalleryView empty collection', () => {
  it('shows an empty sheet', () => {
    render(<GalleryView />);
    expect(screen.getByText(/no photos yet/i)).toBeInTheDocument();
  });
});
