/** Canonical public shop origin. Keep in sync with the matching tags in `index.html`. */
export const SITE_ORIGIN = 'https://adubs.site';
export const SITE_HOST = 'adubs.site';

export const SITE_SHARE_TITLE = 'adubsqz — photography';
export const SITE_TAGLINE =
  'printable film photography as small as a locket for ur momma or prints the size of ur house for when you need to make an impression (or an apology)';
export const SITE_TAGLINE_IMAGE = '/tagline.jpg';
export const SITE_SHARE_DESCRIPTION = SITE_TAGLINE;
export const SITE_OG_IMAGE_PATH = '/og.jpg';

export const INSTAGRAM_URL = 'https://www.instagram.com/adubsqz/';

/**
 * GitHub Pages custom domain (Actions deploys ignore `public/CNAME`):
 * 1. Cloudflare DNS for adubs.site — DNS-only (grey cloud), not proxied.
 * 2. Apex A: 185.199.108.153 185.199.109.153 185.199.110.153 185.199.111.153
 * 3. Apex AAAA: 2606:50c0:8000::153 … :8003::153
 * 4. www CNAME → adubsqz.github.io
 * 5. Repo Pages custom domain: adubs.site (after DNS exists, or github.io redirects to a dead host).
 * 6. Enforce HTTPS once GitHub has issued the cert.
 */
export const SITE_OG_IMAGE_URL = `${SITE_ORIGIN}${SITE_OG_IMAGE_PATH}`;
