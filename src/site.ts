/** Canonical public shop origin. Update this and the matching tags in `index.html` after DNS for a custom domain is live. */
export const SITE_ORIGIN = 'https://adubsqz.github.io';
export const SITE_HOST = 'adubsqz.github.io';

export const SITE_SHARE_TITLE = 'adubsqz — photography';
export const SITE_TAGLINE =
  'printable film photography as small as a locket for ur momma or prints the size of ur house for when you need to make an impression (or an apology)';
export const SITE_TAGLINE_IMAGE = '/tagline.jpg';
export const SITE_SHARE_DESCRIPTION = SITE_TAGLINE;
export const SITE_OG_IMAGE_PATH = '/og.jpg';

export const INSTAGRAM_URL = 'https://www.instagram.com/adubsqz/';

/**
 * GitHub Pages custom domain (do not add `public/CNAME` until the name is yours):
 * 1. Buy the domain (adubsqz.com is unregistered as of 2026-09-09).
 * 2. Repo → Settings → Pages → Custom domain.
 * 3. Apex A records: 185.199.108.153 185.199.109.153 185.199.110.153 185.199.111.153
 * 4. www CNAME → adubsqz.github.io
 * Adding CNAME before DNS works will make github.io redirect to a dead host.
 */
export const SITE_OG_IMAGE_URL = `${SITE_ORIGIN}${SITE_OG_IMAGE_PATH}`;
