import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { edgePhotoGateEnabled, unlockEdgePhotoGate } from './edgeGate';

describe('edgeGate', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('is disabled unless VITE_EDGE_PHOTO_GATE is exactly 1', () => {
    expect(edgePhotoGateEnabled()).toBe(false);
    vi.stubEnv('VITE_EDGE_PHOTO_GATE', 'true');
    expect(edgePhotoGateEnabled()).toBe(false);
    vi.stubEnv('VITE_EDGE_PHOTO_GATE', '1');
    expect(edgePhotoGateEnabled()).toBe(true);
  });

  it('no-ops unlock when the flag is off', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await unlockEdgePhotoGate('test-password');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('POSTs password to /api/gate-unlock when enabled', async () => {
    vi.stubEnv('VITE_EDGE_PHOTO_GATE', '1');
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await unlockEdgePhotoGate('lookbook');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/gate-unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ password: 'lookbook' }),
      credentials: 'same-origin',
    });
  });

  it('swallows network errors so SPA unlock still proceeds', async () => {
    vi.stubEnv('VITE_EDGE_PHOTO_GATE', '1');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(unlockEdgePhotoGate('lookbook')).resolves.toBeUndefined();
  });
});
