# Edge hosting automation (Parts 2–3)

Scripts that prepare Cloudflare in front of GitHub Pages and optionally cookie-gate
`/photos/*`. **Default is dry-run.** Nothing mutates the zone or deploys a Worker
until you pass `--apply`.

Full TLS / proxy hazard context: [docs/ai-crawler-controls.md](../docs/ai-crawler-controls.md).

## Prerequisites

1. Cloudflare API token (`CLOUDFLARE_API_TOKEN`) with zone-scoped permissions for
   `adubs.site` — see error text from `npm run hosting:orange-cloud`.
2. Confirm GitHub Pages HTTPS is healthy **while still grey-clouded**.
3. For Part 3: Wrangler login (`npx wrangler login`) and secrets set once:

```bash
npx wrangler secret put GATE_PASSWORD --config hosting/photo-gate/wrangler.toml
npx wrangler secret put GATE_HMAC_SECRET --config hosting/photo-gate/wrangler.toml
npx wrangler secret put GALLERY_JWT_SECRET --config hosting/photo-gate/wrangler.toml
```

Use a long random `GATE_HMAC_SECRET`. `GALLERY_JWT_SECRET` must match the SPA
lookbook JWT HMAC in `src/galleryJwt.ts` (needed so returning visitors with a
valid localStorage JWT can mint the edge cookie without re-typing the password).
Do not commit secrets.

**Cache conflict:** public gallery Cache Rules (`hosting:photo-cache-rules`) and
the photo-gate Worker fight each other. Once the Worker is live it sets
`Cache-Control: private, no-store` and `cf.cacheTtl: 0` on authorized fetches.
Until the Worker is deployed, photos remain publicly cacheable at the edge.

## Part 2 — Orange cloud (safe order)

```bash
# Plan only
CLOUDFLARE_API_TOKEN='…' npm run hosting:orange-cloud -- --dry-run

# 1) Pin SSL Full + www redirect + AI UA WAF rule (DNS still grey)
CLOUDFLARE_API_TOKEN='…' npm run hosting:orange-cloud -- --apply --phase ssl,rules,bots

# 2) Flip DNS to proxied
CLOUDFLARE_API_TOKEN='…' npm run hosting:orange-cloud -- --apply --phase dns

# 3) Live checks
npm run hosting:verify-edge

# 4) Gallery photo cache rules
CLOUDFLARE_API_TOKEN='…' npm run hosting:orange-cloud -- --apply --phase cache

# 5) Only after verify is clean
CLOUDFLARE_API_TOKEN='…' npm run hosting:orange-cloud -- --apply --phase always-https
```

Also confirm Search / Training / Agent presets in the Cloudflare dashboard if zone
settings soft-fail on Free plan (script still installs a UA block WAF rule).

## Part 3 — Photo-gate Worker

Routes (see `hosting/photo-gate/wrangler.toml`):

- `POST /api/gate-unlock` — sets HttpOnly `adubs_gate` cookie
- `GET|HEAD /photos/*` — 403 without cookie; otherwise proxies to origin

```bash
npm run hosting:photo-gate:deploy              # dry-run + orange-cloud check
npm run hosting:photo-gate:deploy -- --apply   # wrangler deploy
```

Then bake the SPA flag into Pages builds (GitHub Actions secret + `.env.local`):

```bash
VITE_EDGE_PHOTO_GATE=1
```

`PasswordGate` calls `unlockEdgePhotoGate` after a successful local JWT mint. The
UI still works if the Worker is down; JPEGs stay unprotected until the Worker is
live **and** DNS is orange-clouded.

## Verify

```bash
npm run hosting:verify-edge
curl -sI https://adubs.site/photos/still-life/color/cheers.jpg   # 403 after Worker
# unlock in browser, then:
curl -sI -b 'adubs_gate=…' https://adubs.site/photos/still-life/color/cheers.jpg
```

## Rollback notes

- DNS back to grey-cloud is painful once GitHub’s cert stops renewing — prefer
  staying proxied with SSL **Full**, or migrate origin to Cloudflare Pages.
- Delete Worker routes or `wrangler delete` to stop the photo cookie gate.
