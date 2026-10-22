/**
 * Optional Cloudflare Worker unlock for /photos/* (HttpOnly cookie).
 * Enabled only when VITE_EDGE_PHOTO_GATE===1 (production orange-cloud builds).
 * Local JWT curtain still applies; this is a no-op when the flag is off.
 */

export function edgePhotoGateEnabled(): boolean {
  return import.meta.env.VITE_EDGE_PHOTO_GATE === '1';
}

/**
 * POST the lookbook password to /api/gate-unlock so the Worker can set
 * the signed adubs_gate cookie. Soft-fails: SPA unlock must not depend on edge.
 */
export async function unlockEdgePhotoGate(password: string): Promise<void> {
  if (!edgePhotoGateEnabled()) return;

  try {
    await fetch('/api/gate-unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ password }),
      credentials: 'same-origin',
    });
  } catch {
    // Worker may be undeployed or offline; local JWT still unlocks the UI.
  }
}
