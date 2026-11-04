import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  FilmTvClearanceBlock,
  RightsReservedBlock,
  TearsheetAndFulfillmentGrid,
} from './LicensingDetails';
import { SITE_HOST, SITE_ORIGIN } from '../site';

describe('LicensingDetails', () => {
  it('renders film/TV clearance copy', () => {
    render(<FilmTvClearanceBlock />);
    expect(screen.getByText(/Film \+ TV Clearance Guarantee/i)).toBeInTheDocument();
    expect(screen.getByText(/pre-cleared for Film, Television/i)).toBeInTheDocument();
  });

  it('renders the plain rights block used on About', () => {
    render(<RightsReservedBlock plain />);
    expect(screen.getByText(/rights reserved/i)).toBeInTheDocument();
    expect(screen.getByText(/scraping/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: SITE_HOST })).toHaveAttribute('href', SITE_ORIGIN);
  });

  it('renders the card rights block used in modals', () => {
    render(<RightsReservedBlock />);
    expect(screen.getByText(/AI\/ML training/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: SITE_HOST })).toHaveAttribute('href', SITE_ORIGIN);
  });

  it('renders tearsheet and fulfillment cards', () => {
    render(<TearsheetAndFulfillmentGrid />);
    expect(screen.getByText(/Trade Portal \+ Tearsheet/i)).toBeInTheDocument();
    expect(screen.getByText(/Fulfillment \+ licensing/i)).toBeInTheDocument();
    render(<TearsheetAndFulfillmentGrid surface="modal" />);
    expect(screen.getAllByText(/8\.5×11/).length).toBeGreaterThan(0);
  });
});
