/// <reference types="vite/client" />
/// <reference types="vitest/globals" />

interface ImportMetaEnv {
  readonly VITE_E2E?: string;
  readonly VITE_REQUIRE_PASSWORD_GATE?: string;
  readonly VITE_FORMSUBMIT_ID?: string;
  readonly VITE_FORMSUBMIT_EMAIL?: string;
  readonly VITE_WEB3FORMS_ACCESS_KEY?: string;
  readonly VITE_CF_BEACON_TOKEN?: string;
}
