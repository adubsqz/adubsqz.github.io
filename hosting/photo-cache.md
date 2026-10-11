# Gallery photo caching (GitHub Pages + Cloudflare)

Published stills live at stable paths under `/photos/still-life/` and (contact-sheet thumbs) `/photos/sheet/`. Re-import overwrites the same URL, so **do not** use `immutable` or year-long browser caches without a purge story.

Target response header (also in `hosting/photo-cache.ts`):

```http
Cache-Control: public, max-age=604800, stale-while-revalidate=86400
```

## What the repo cannot do alone

| Mechanism | Applies on this stack? |
| --- | --- |
| `public/_headers` | **No** — Netlify / Cloudflare **Pages** only, not GitHub Pages. |
| Vite build / `dist/` | **No** — static hosts do not read sidecar header files. |
| GitHub Pages | **No** — origin serves JPEGs with a short default (`max-age=14400` today). |

Long-lived caching requires **Cloudflare in front of GitHub Pages** (orange-cloud / proxied DNS). Grey-cloud DNS-only means browsers only see GitHub’s headers and there is no edge cache.

See also `docs/ai-crawler-controls.md` (proxy / TLS runbook) and `src/site.ts` (DNS notes).

## Recommended Cloudflare rules (Free plan)

Use **two** rules. Do **not** set `s-maxage` on these responses — it disables `stale-while-revalidate` at Cloudflare.

### 1. Cache rule (request phase)

**Caching → Cache Rules → Create rule**

- **Name:** `Gallery photos — cache at edge`
- **When incoming requests match…** (Expression Editor):

  ```txt
  (starts_with(http.request.uri.path, "/photos/still-life/") or starts_with(http.request.uri.path, "/photos/sheet/")) and http.request.method eq "GET"
  ```

- **Then…**
  - Cache eligibility: **Eligible for cache**
  - Edge TTL: **Ignore cache-control header and use this TTL** → **7 days** (604800 seconds)
  - Serve stale content while revalidating: **On** (if shown)

This keeps return visits fast at the edge even though GitHub only sends four-hour `max-age`.

### 2. Cache response rule (response phase)

**Caching → Cache Rules → Create rule → Cache response rule** (or **Rules → Cache Response Rules**, depending on dashboard layout)

- **Name:** `Gallery photos — browser Cache-Control`
- **When…** same expression as above (match on request path/method).
- **Then modify Cache-Control from origin:**
  - Set **`public`**
  - Set **`max-age`** = **604800**
  - Set **`stale-while-revalidate`** = **86400**
  - Do **not** add `immutable`.

Cache response rules run **before** Cloudflare caches the origin response, so edge and browsers both see the long TTL + SWR behavior described in [Cache Response Rules](https://developers.cloudflare.com/cache/how-to/cache-response-rules/).

**Merge with existing rules:** add these at the **top** of the list (more specific than site-wide rules). The API examples in Cloudflare docs that `PUT` an entire ruleset **replace** all rules — prefer the dashboard or patch individual rules if you already have cache rules.

### Apply via API (recommended)

The Cursor Cloudflare MCP session is **read-only** (no Cache Rules Edit). Use a short-lived API token:

1. [Create API token](https://dash.cloudflare.com/profile/api-tokens) → Custom → **Zone / Cache Rules / Edit** + **Zone / Zone / Read**, zone `adubs.site`.
2. Run (token is not stored in the repo):

```bash
CLOUDFLARE_API_TOKEN='…' npm run hosting:photo-cache-rules
```

That script (`hosting/apply-photo-cache-rules.mjs`) upserts both rules via the Rulesets API and keeps any other rules already in those phases.

## After republishing photos

Same URL + new bytes → purge or invalidate edge cache once `main` deploy finishes, or wait for TTL (up to 7 days at edge; browsers up to 7 days unless purged).

- **Dashboard:** Caching → Configuration → **Custom purge** → prefix `/photos/still-life/` and `/photos/sheet/`, or purge everything if you prefer.
- **API (optional):** `POST /zones/:id/purge_cache` with `{"prefixes":["https://adubs.site/photos/still-life/","https://adubs.site/photos/sheet/"]}`.

Purging Cloudflare does **not** clear visitors’ browser caches; SWR + moderate `max-age` limits how long a stale frame can linger locally.

## Verify in production

```bash
curl -sI 'https://adubs.site/photos/still-life/color/cheers.jpg' \
  | grep -iE 'cache-control|cf-cache-status|cf-ray|server|age'
```

Expect:

- `server: cloudflare` and a `cf-ray` (proxy on)
- `cache-control: public, max-age=604800, stale-while-revalidate=86400` (after response rule)
- Repeat request: `cf-cache-status: HIT` (after warm-up)

## Local dev / preview parity

`vite.config.ts` sets the same `Cache-Control` on gallery photo responses in `npm run dev` and `vite preview` only. Production headers come from Cloudflare, not Vite.
