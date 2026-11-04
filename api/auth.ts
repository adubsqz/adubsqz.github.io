const COOKIE_NAME = 'gallery_auth';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

const textEncoder = new TextEncoder();

function bytesToHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, '0');
  }
  return out;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

async function signToken(secret: string, expiresAtMs: number): Promise<string> {
  const key = await importHmacKey(secret);
  const payload = `${expiresAtMs}`;
  const sig = await crypto.subtle.sign('HMAC', key, textEncoder.encode(payload));
  return `${payload}.${bytesToHex(new Uint8Array(sig))}`;
}

async function verifyToken(secret: string, token: string): Promise<boolean> {
  const dot = token.indexOf('.');
  if (dot <= 0) return false;

  const payload = token.slice(0, dot);
  const hex = token.slice(dot + 1);
  if (!/^\d+$/.test(payload) || !/^[0-9a-f]+$/i.test(hex) || hex.length % 2 !== 0) {
    return false;
  }

  const expiresAtMs = Number(payload);
  if (!Number.isFinite(expiresAtMs) || expiresAtMs < Date.now()) {
    return false;
  }

  const sig = new Uint8Array(hex.length / 2);
  for (let i = 0; i < sig.length; i++) {
    sig[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }

  const key = await importHmacKey(secret);
  return crypto.subtle.verify('HMAC', key, sig, textEncoder.encode(payload));
}

function parseCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  const parts = header.split(';');
  for (const part of parts) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const k = part.slice(0, eq).trim();
    if (k === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return null;
}

function buildCookie(token: string, maxAgeSeconds: number): string {
  return [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ].join('; ');
}

function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
}

function explicitGalleryPublic(): boolean {
  const v = process.env.GALLERY_PUBLIC?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

/** On Vercel, missing GALLERY_PASSWORD used to expose the gallery. Fail closed unless explicitly public. */
function lockedBecausePasswordUnset(onVercel: boolean, configuredPassword: string): boolean {
  return onVercel && !configuredPassword && !explicitGalleryPublic();
}

export default async function handler(req: Request): Promise<Response> {
  const configuredPassword = process.env.GALLERY_PASSWORD?.trim() ?? '';
  const secret = process.env.GALLERY_AUTH_SECRET?.trim() ?? '';
  const onVercel = Boolean(process.env.VERCEL);

  if (lockedBecausePasswordUnset(onVercel, configuredPassword)) {
    if (req.method === 'GET') {
      return json({
        authenticated: false,
        required: true,
        misconfigured: true,
      });
    }
    if (req.method === 'POST') {
      return json(
        {
          error:
            'Gallery password is not configured. In Vercel → Settings → Environment Variables, set GALLERY_PASSWORD and GALLERY_AUTH_SECRET. To intentionally ship a public gallery from Vercel, set GALLERY_PUBLIC=1.',
        },
        { status: 503 }
      );
    }
    if (req.method === 'DELETE') {
      return json(
        { authenticated: false, required: true, misconfigured: true },
        { status: 200, headers: { 'Set-Cookie': buildCookie('', 0) } }
      );
    }
    return json({ error: 'Method not allowed.' }, { status: 405, headers: { Allow: 'GET, POST, DELETE' } });
  }

  // No password configured (local dev or non-Vercel) → site is public.
  if (!configuredPassword) {
    return json({ authenticated: true, required: false });
  }

  if (!secret) {
    return json(
      { error: 'Auth is misconfigured: GALLERY_AUTH_SECRET is not set.' },
      { status: 500 }
    );
  }

  if (req.method === 'GET') {
    const token = parseCookie(req.headers.get('cookie'), COOKIE_NAME);
    const ok = token ? await verifyToken(secret, token) : false;
    return json({ authenticated: ok, required: true });
  }

  if (req.method === 'POST') {
    let submitted = '';
    try {
      const body = (await req.json()) as { password?: unknown };
      if (typeof body?.password === 'string') submitted = body.password;
    } catch {
      return json({ error: 'Invalid request body.' }, { status: 400 });
    }

    // Constant-time-ish compare: same-length XOR check.
    const a = textEncoder.encode(submitted);
    const b = textEncoder.encode(configuredPassword);
    let diff = a.length ^ b.length;
    const len = Math.max(a.length, b.length);
    for (let i = 0; i < len; i++) {
      diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
    }

    if (diff !== 0) {
      return json({ error: 'Incorrect password.' }, { status: 401 });
    }

    const expiresAtMs = Date.now() + COOKIE_MAX_AGE_SECONDS * 1000;
    const token = await signToken(secret, expiresAtMs);
    return json(
      { authenticated: true, required: true },
      {
        status: 200,
        headers: { 'Set-Cookie': buildCookie(token, COOKIE_MAX_AGE_SECONDS) },
      }
    );
  }

  if (req.method === 'DELETE') {
    return json(
      { authenticated: false, required: true },
      {
        status: 200,
        headers: { 'Set-Cookie': buildCookie('', 0) },
      }
    );
  }

  return json({ error: 'Method not allowed.' }, { status: 405, headers: { Allow: 'GET, POST, DELETE' } });
}

export const config = {
  runtime: 'edge',
  regions: ['iad1'],
};
