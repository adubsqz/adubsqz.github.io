/// <reference types="vite/client" />
/// <reference types="vitest/globals" />

interface ImportMetaEnv {
  readonly VITE_E2E?: string;
  readonly VITE_REQUIRE_PASSWORD_GATE?: string;
  /** When `1`, PasswordGate also POSTs to `/api/gate-unlock` (Cloudflare Worker). */
  readonly VITE_EDGE_PHOTO_GATE?: string;
  readonly VITE_FORMSUBMIT_ID?: string;
  readonly VITE_FORMSUBMIT_EMAIL?: string;
  readonly VITE_WEB3FORMS_ACCESS_KEY?: string;
  readonly VITE_CF_BEACON_TOKEN?: string;
  /** Set to `1` after photo-gate Worker is live (orange-cloud). */
  readonly VITE_EDGE_PHOTO_GATE?: string;
}
