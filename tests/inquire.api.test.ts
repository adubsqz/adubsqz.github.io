import { describe, it, expect, vi, beforeEach } from 'vitest';

const sendMock = vi.fn();

vi.mock('resend', () => {
  return {
    Resend: vi.fn().mockImplementation(function () {
      return {
        emails: {
          send: sendMock,
        },
      };
    }),
  };
});

function postJson(body: unknown) {
  return new Request('http://localhost/api/inquire', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('/api/inquire (unit)', () => {
  beforeEach(() => {
    sendMock.mockReset();
  });

  it('returns 405 for non-POST requests', async () => {
    vi.resetModules();
    const { default: handler } = await import('../api/inquire.ts');

    const res = await handler(new Request('http://localhost/api/inquire', { method: 'GET' }));
    expect(res.status).toBe(405);
    const json = await res.json();
    expect(json.error).toMatch(/method not allowed/i);
  });

  it('returns 500 when RESEND_API_KEY is not configured', async () => {
    vi.resetModules();
    delete process.env.RESEND_API_KEY;
    delete process.env.INQUIRY_RECIPIENT_EMAIL;
    delete process.env.RESEND_FROM_EMAIL;

    const { default: handler } = await import('../api/inquire.ts');

    const res = await handler(
      postJson({
        name: 'Jane',
        email: 'jane@example.com',
        shippingAddress: '123 Main St',
        printSize: '16x20',
      })
    );

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/RESEND_API_KEY is not configured/i);
  });

  it('returns 400 when required fields are missing', async () => {
    vi.resetModules();
    process.env.RESEND_API_KEY = 're_test';
    process.env.INQUIRY_RECIPIENT_EMAIL = 'to@example.com';
    process.env.RESEND_FROM_EMAIL = 'from@example.com';

    const { default: handler } = await import('../api/inquire.ts');

    const res = await handler(
      postJson({
        // name/email/shippingAddress/printSize are required
        photoId: 'bw-1',
      })
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/missing required fields/i);
  });

  it('returns 500 when recipient/sender env vars are missing', async () => {
    vi.resetModules();
    process.env.RESEND_API_KEY = 're_test';
    delete process.env.INQUIRY_RECIPIENT_EMAIL;
    delete process.env.RESEND_FROM_EMAIL;

    const { default: handler } = await import('../api/inquire.ts');

    const res = await handler(
      postJson({
        photoId: 'bw-1',
        photoAlt: 'Still life 1',
        photoSrc: '/photos/still-life/bw/000230040034.jpg',
        name: 'Jane Doe',
        email: 'jane@example.com',
        shippingAddress: '123 Main St',
        printSize: '16x20',
      })
    );

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/RESEND_FROM_EMAIL is not configured/i);
  });

  it('returns 200 on successful Resend send', async () => {
    vi.resetModules();
    process.env.RESEND_API_KEY = 're_test';
    process.env.INQUIRY_RECIPIENT_EMAIL = 'to@example.com';
    process.env.RESEND_FROM_EMAIL = 'from@example.com';

    sendMock.mockResolvedValue({
      data: { id: 'msg_1' },
      error: null,
    });

    const { default: handler } = await import('../api/inquire.ts');

    const res = await handler(
      postJson({
        photoId: 'bw-1',
        photoAlt: 'Still life 1',
        photoSrc: '/photos/still-life/bw/000230040034.jpg',
        name: 'Jane Doe',
        email: 'jane@example.com',
        company: 'ACME',
        shippingAddress: '123 Main St',
        printSize: '16x20',
        printMedium: 'canvas',
        printFinish: 'matte',
        notes: 'Please include rush shipping.',
      })
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.messageId).toBe('msg_1');
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'to@example.com',
        replyTo: 'jane@example.com',
      })
    );
  });

  it('returns 400 for invalid email', async () => {
    vi.resetModules();
    process.env.RESEND_API_KEY = 're_test';
    process.env.INQUIRY_RECIPIENT_EMAIL = 'to@example.com';
    process.env.RESEND_FROM_EMAIL = 'from@example.com';

    const { default: handler } = await import('../api/inquire.ts');

    const res = await handler(
      postJson({
        name: 'Jane',
        email: 'not-an-email',
        shippingAddress: '123 Main St',
        printSize: '16x20',
      })
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/invalid email/i);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('escapes HTML in notification bodies', async () => {
    vi.resetModules();
    process.env.RESEND_API_KEY = 're_test';
    process.env.INQUIRY_RECIPIENT_EMAIL = 'to@example.com';
    process.env.RESEND_FROM_EMAIL = 'from@example.com';

    sendMock.mockResolvedValue({
      data: { id: 'msg_2' },
      error: null,
    });

    const { default: handler } = await import('../api/inquire.ts');

    const res = await handler(
      postJson({
        name: '<img src=x onerror=alert(1)>',
        email: 'jane@example.com',
        shippingAddress: '123 Main St',
        printSize: '16x20',
        notes: '<script>alert(1)</script>',
      })
    );

    expect(res.status).toBe(200);
    const sent = sendMock.mock.calls[0][0] as { html: string };
    expect(sent.html).not.toContain('<img src=x');
    expect(sent.html).toContain('&lt;img src=x');
    expect(sent.html).not.toContain('<script>');
  });

  it('returns 500 when Resend send returns an error', async () => {
    vi.resetModules();
    process.env.RESEND_API_KEY = 're_test';
    process.env.INQUIRY_RECIPIENT_EMAIL = 'to@example.com';
    process.env.RESEND_FROM_EMAIL = 'from@example.com';

    sendMock.mockResolvedValue({
      data: null,
      error: { message: 'resend failed' },
    });

    const { default: handler } = await import('../api/inquire.ts');

    const res = await handler(
      postJson({
        photoId: 'bw-1',
        photoAlt: 'Still life 1',
        photoSrc: '/photos/still-life/bw/000230040034.jpg',
        name: 'Jane Doe',
        email: 'jane@example.com',
        shippingAddress: '123 Main St',
        printSize: '16x20',
      })
    );

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/resend failed/i);
    expect(json.details).toBeUndefined();
  });
});
