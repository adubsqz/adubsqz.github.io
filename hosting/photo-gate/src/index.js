/**
 * Edge cookie gate for /photos/* in front of GitHub Pages.
 *
 * POST /api/gate-unlock — verify GATE_PASSWORD (trim+lower), set signed cookie
 * GET  /photos/*        — require cookie; else 403 no-store + X-Robots-Tag noai
 *
 * Cookie value: `<exp>.<hex HMAC-SHA256 of "unlocked:<exp>" with GATE_HMAC_SECRET>`
 * Flags: HttpOnly; Secure; SameSite=Strict; Path=/
 */

const DENY_HEADERS = {
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noai, noimageai',
  'Content-Type': 'text/plain; charset=utf-8',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/api/gate-unlock') {
      return handleUnlock(request, env);
    }

    if (path.startsWith('/photos/')) {
      return handlePhotos(request, env);
    }

    return new Response('Not found', { status: 404, headers: DENY_HEADERS });
  },
};

async function handleUnlock(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: DENY_HEADERS });
  }

  const password = env.GATE_PASSWORD;
  const secret = env.GATE_HMAC_SECRET;
  if (!password || !secret) {
    return new Response('Gate not configured', { status: 503, headers: DENY_HEADERS });
  }

  let submitted = '';
  const contentType = request.headers.get('content-type') || '';
  try {
    if (contentType.includes('application/json')) {
      const body = await request.json();
      submitted = typeof body?.password === 'string' ? body.password : '';
    } else {
      const form = await request.formData();
      const value = form.get('password');
      submitted = typeof value === 'string' ? value : '';
    }
  } catch {
    return new Response('Bad request', { status: 400, headers: DENY_HEADERS });
  }

  if (!passwordsMatch(normalizePassword(submitted), normalizePassword(password))) {
    return new Response('Forbidden', { status: 403, headers: DENY_HEADERS });
  }

  const cookieName = env.COOKIE_NAME || 'adubs_gate';
  const ttl = Number.parseInt(env.TTL_SECONDS || '2592000', 10) || 2_592_000;
  const exp = Math.floor(Date.now() / 1000) + ttl;
  const sig = await hmacHex(secret, `unlocked:${exp}`);
  const value = `${exp}.${sig}`;

  const headers = new Headers({
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
  });
  headers.append(
    'Set-Cookie',
    `${cookieName}=${value}; Path=/; Max-Age=${ttl}; HttpOnly; Secure; SameSite=Strict`,
  );

  return new Response(JSON.stringify({ ok: true, exp }), { status: 200, headers });
}

async function handlePhotos(request, env) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405, headers: DENY_HEADERS });
  }

  const secret = env.GATE_HMAC_SECRET;
  const cookieName = env.COOKIE_NAME || 'adubs_gate';
  if (!secret) {
    return new Response('Forbidden', { status: 403, headers: DENY_HEADERS });
  }

  const cookie = readCookie(request.headers.get('Cookie') || '', cookieName);
  const ok = await verifyGateCookie(cookie, secret);
  if (!ok) {
    return new Response('Forbidden', { status: 403, headers: DENY_HEADERS });
  }

  const upstream = await fetch(request);
  const headers = new Headers(upstream.headers);
  headers.set('Cache-Control', 'private');
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}

function normalizePassword(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

function passwordsMatch(a, b) {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  let diff = left.length ^ right.length;
  const len = Math.max(left.length, right.length);
  for (let i = 0; i < len; i += 1) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}

function readCookie(header, name) {
  const parts = header.split(';');
  for (const part of parts) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    if (trimmed.slice(0, eq) === name) return trimmed.slice(eq + 1);
  }
  return '';
}

async function verifyGateCookie(value, secret) {
  if (!value) return false;
  const dot = value.indexOf('.');
  if (dot <= 0) return false;
  const expStr = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  if (!/^\d+$/.test(expStr) || !/^[0-9a-f]+$/i.test(sig)) return false;
  const exp = Number.parseInt(expStr, 10);
  if (!Number.isFinite(exp) || exp * 1000 <= Date.now()) return false;
  const expected = await hmacHex(secret, `unlocked:${exp}`);
  return passwordsMatch(sig.toLowerCase(), expected.toLowerCase());
}

async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
