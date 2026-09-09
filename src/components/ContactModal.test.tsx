import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContactModal from './ContactModal';
import { ABOUT } from '../data';
import { FORMSUBMIT_FORM_ID } from '../inquireStatic';

describe('ContactModal', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    onClose.mockClear();
    // Prevent actual navigation in jsdom while keeping type-check happy.
    const location = window.location;
    delete (window as unknown as { location?: Location }).location;
    (window as unknown as { location: Location }).location = {
      ...location,
      href: '',
    } as Location;
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('renders contact form with all fields', () => {
    render(<ContactModal onClose={onClose} />);
    expect(screen.getByRole('dialog', { name: /contact/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/subject/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send/i }).className).toMatch(/mcm-brick/);
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('prefills subject and message for a named still', () => {
    render(
      <ContactModal
        onClose={onClose}
        initialSubject="About Photograph neon"
        initialMessage="I'd like to talk about this still: Photograph neon (color-1)."
      />,
    );
    expect(screen.getByLabelText(/subject/i)).toHaveValue('About Photograph neon');
    expect(screen.getByLabelText(/message/i)).toHaveValue(
      "I'd like to talk about this still: Photograph neon (color-1).",
    );
    expect(screen.queryByLabelText(/shipping address/i)).not.toBeInTheDocument();
  });

  it('calls onClose when Close button is clicked', async () => {
    const user = userEvent.setup();
    render(<ContactModal onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<ContactModal onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on Escape key', async () => {
    const user = userEvent.setup();
    render(<ContactModal onClose={onClose} />);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('submits form with mailto link and closes modal', async () => {
    const user = userEvent.setup();
    render(<ContactModal onClose={onClose} />);
    await user.type(screen.getByLabelText(/name/i), 'Jane');
    await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
    await user.type(screen.getByLabelText(/subject/i), 'Hello');
    await user.type(screen.getByLabelText(/message/i), 'Hi there');

    const submitButton = screen.getByRole('button', { name: /send/i });
    await user.click(submitButton);

    expect(await screen.findByText(/message sent/i)).toBeInTheDocument();
    expect(window.location.href).toContain('mailto:adubsqz@gmail.com');
    expect(window.location.href).toContain(ABOUT.contactEmail);
    expect(window.location.href).toContain('subject=');
    expect(window.location.href).toContain(encodeURIComponent('Hello'));
    expect(window.location.href).toContain(encodeURIComponent('Jane'));
    expect(window.location.href).toContain(encodeURIComponent('jane@example.com'));
    expect(window.location.href).toContain(encodeURIComponent('Hi there'));
  });

  it('posts to the activated FormSubmit hash when fetch succeeds', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<ContactModal onClose={onClose} />);
    await user.type(screen.getByLabelText(/name/i), 'Jane');
    await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
    await user.type(screen.getByLabelText(/subject/i), 'Hello');
    await user.type(screen.getByLabelText(/message/i), 'Hi there');
    await user.click(screen.getByRole('button', { name: /send/i }));
    expect(fetchMock).toHaveBeenCalledWith(
      `https://formsubmit.co/ajax/${FORMSUBMIT_FORM_ID}`,
      expect.objectContaining({ method: 'POST' }),
    );
    expect(window.location.href).not.toMatch(/^mailto:/);
    expect(await screen.findByText(/message sent/i)).toBeInTheDocument();
  });
});

