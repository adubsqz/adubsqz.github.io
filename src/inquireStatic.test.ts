import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  submitPrintInquiry,
  submitContactMessage,
  contactPrefillForPhoto,
  newInquiryCode,
  sentConfirmationHint,
  type InquirePayload,
} from './inquireStatic';
import { ABOUT } from './data';

function okFetch() {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ success: true }),
  });
}

const photo = { id: 'p1', src: '/photos/still-life/color/x.jpg', alt: 'Neon' };

function payload(extra: Partial<InquirePayload> = {}): InquirePayload {
  return {
    photo,
    name: 'Ada',
    email: 'ada@example.com',
    company: '',
    shippingAddress: '1 Main',
    size: '16x20',
    printMedium: 'fine-art-paper',
    printFinish: 'matte',
    notes: '',
    ...extra,
  };
}

function stubLocation() {
  const location = window.location;
  delete (window as unknown as { location?: Location }).location;
  (window as unknown as { location: Location }).location = { ...location, href: '' } as Location;
}

describe('contactPrefillForPhoto', () => {
  it('names the still in subject and message', () => {
    const prefill = contactPrefillForPhoto({ id: 'greyscale-3', alt: 'Photograph bw alley' });
    expect(prefill.subject).toBe('About Photograph bw alley');
    expect(prefill.message).toContain('Photograph bw alley');
    expect(prefill.message).toContain('greyscale-3');
  });

  it('falls back to the photo id when alt is empty', () => {
    const prefill = contactPrefillForPhoto({ id: 'color-2', alt: '' });
    expect(prefill.subject).toBe('About color-2');
    expect(prefill.message).toContain('color-2');
  });
});

describe('sentConfirmationHint', () => {
  it('tells the visitor to check the address they typed, not the studio inbox', () => {
    expect(sentConfirmationHint('xxxamesx@gmail.com')).toBe(
      'Check xxxamesx@gmail.com (and spam). If nothing arrives, Send again and your mail app will open.',
    );
    expect(sentConfirmationHint('  jane@example.com  ')).toContain('jane@example.com');
    expect(sentConfirmationHint('xxxamesx@gmail.com')).not.toContain(ABOUT.contactEmail);
    expect(sentConfirmationHint('')).toBe(
      'Check your inbox (and spam). If nothing arrives, Send again and your mail app will open.',
    );
  });
});

describe('newInquiryCode', () => {
  it('returns 9 alphanumeric characters', () => {
    const code = newInquiryCode();
    expect(code).toMatch(/^[A-Z0-9]{9}$/);
    expect(newInquiryCode()).not.toBe(code);
  });
});

describe('submitPrintInquiry', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('uses Web3Forms when the access key is set and the request succeeds', async () => {
    vi.stubEnv('VITE_WEB3FORMS_ACCESS_KEY', 'wk');
    stubLocation();
    const fetchMock = okFetch();
    vi.stubGlobal('fetch', fetchMock);
    await submitPrintInquiry(payload({ company: 'Studio', notes: 'rush' }));
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.web3forms.com/submit',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(window.location.href).not.toMatch(/^mailto:/);
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.access_key).toBe('wk');
    expect(body.inquiry_number).toMatch(/^[A-Z0-9]{9}$/);
    expect(body.message).toContain(`Inquiry #: ${body.inquiry_number}`);
    expect(body.subject).toContain(body.inquiry_number);
  });

  it('uses mailto:adubsqz@gmail.com when Web3Forms key is unset', async () => {
    vi.stubEnv('VITE_WEB3FORMS_ACCESS_KEY', '');
    const fetchMock = okFetch();
    vi.stubGlobal('fetch', fetchMock);
    stubLocation();
    await submitPrintInquiry(payload());
    expect(fetchMock).not.toHaveBeenCalled();
    expect(window.location.href).toContain('mailto:adubsqz@gmail.com');
    expect(ABOUT.contactEmail).toBe('adubsqz@gmail.com');
  });

  it('falls back to mailto when Web3Forms returns HTTP 200 without success', async () => {
    vi.stubEnv('VITE_WEB3FORMS_ACCESS_KEY', 'wk');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: false, message: 'Invalid access key' }),
      }),
    );
    stubLocation();
    await submitPrintInquiry(payload());
    expect(window.location.href).toContain('mailto:adubsqz@gmail.com');
  });

  it('falls back to mailto:adubsqz@gmail.com when remote submit fails', async () => {
    vi.stubEnv('VITE_WEB3FORMS_ACCESS_KEY', 'wk');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    stubLocation();
    await submitPrintInquiry(payload({ photo: { ...photo, alt: '' } }));
    expect(window.location.href).toContain('mailto:adubsqz@gmail.com');
    expect(window.location.href).toContain(encodeURIComponent('Print inquiry: p1'));
  });

  it('falls back to mailto when fetch throws', async () => {
    vi.stubEnv('VITE_WEB3FORMS_ACCESS_KEY', 'wk');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    stubLocation();
    await submitPrintInquiry(payload());
    expect(window.location.href).toContain('mailto:adubsqz@gmail.com');
  });
});

describe('submitContactMessage', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('posts contact mail to Web3Forms when the access key is set', async () => {
    vi.stubEnv('VITE_WEB3FORMS_ACCESS_KEY', 'wk');
    stubLocation();
    const fetchMock = okFetch();
    vi.stubGlobal('fetch', fetchMock);
    await submitContactMessage({
      name: 'Jane',
      email: 'jane@example.com',
      subject: 'Hello',
      message: 'Hi there',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.web3forms.com/submit',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(window.location.href).not.toMatch(/^mailto:/);
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.inquiry_number).toMatch(/^[A-Z0-9]{9}$/);
    expect(body.subject).toContain(body.inquiry_number);
  });

  it('falls back to mailto:adubsqz@gmail.com when Web3Forms key is unset', async () => {
    vi.stubEnv('VITE_WEB3FORMS_ACCESS_KEY', '');
    const fetchMock = okFetch();
    vi.stubGlobal('fetch', fetchMock);
    stubLocation();
    await submitContactMessage({
      name: 'Jane',
      email: 'jane@example.com',
      subject: 'Hello',
      message: 'Hi there',
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(window.location.href).toContain('mailto:adubsqz@gmail.com');
    expect(window.location.href).toContain(encodeURIComponent('Hello'));
  });

  it('falls back to mailto:adubsqz@gmail.com when Web3Forms fails', async () => {
    vi.stubEnv('VITE_WEB3FORMS_ACCESS_KEY', 'wk');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    stubLocation();
    await submitContactMessage({
      name: 'Jane',
      email: 'jane@example.com',
      subject: 'Hello',
      message: 'Hi there',
    });
    expect(window.location.href).toContain('mailto:adubsqz@gmail.com');
    expect(window.location.href).toContain(encodeURIComponent('Hello'));
  });
});
