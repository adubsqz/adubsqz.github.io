/**
 * Optional Cloudflare Worker unlock for /photos/* (HttpOnly cookie).
 * Enabled only when VITE_EDGE_PHOTO_GATE===1 (production orange-cloud builds).
 * Local JWT curtain still applies; this is a no-op when the flag is off.
 */

export type EdgeUnlockPayload = {
  /** Fresh lookbook password (password form submit). */
  password?: string;
  /** Stored lookbook JWT (session restore — password not available). */
  jwt?: string;
};

export function edgePhotoGateEnabled(): boolean {
  return import.meta.env.VITE_EDGE_PHOTO_GATE === '1';
}

/**
 * POST to /api/gate-unlock so the Worker can set the signed adubs_gate cookie.
 * Soft-fails: SPA unlock must not depend on edge.
 */
export async function unlockEdgePhotoGate(payload: EdgeUnlockPayload | string): Promise<void> {
  if (!edgePhotoGateEnabled()) return;

  const body =
    typeof payload === 'string'
      ? { password: payload }
      : {
          ...(payload.password ? { password: payload.password } : {}),
          ...(payload.jwt ? { jwt: payload.jwt } : {}),
        };

  if (!('password' in body) && !('jwt' in body)) return;

  try {
    await fetch('/api/gate-unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      credentials: 'same-origin',
    });
  } catch {
    // Worker may be undeployed or offline; local JWT still unlocks the UI.
  }
}
