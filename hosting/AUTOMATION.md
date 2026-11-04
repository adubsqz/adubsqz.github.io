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

If deploy uploads the Worker but fails with **Could not find zone for `adubs.site`**,
Wrangler is on the wrong Cloudflare account (DNS can still show `cf-ray`). Fix:

```bash
npx wrangler whoami
# Dashboard → account that owns adubs.site → Overview → copy Account ID + Zone ID
export CLOUDFLARE_ACCOUNT_ID='…'
export CLOUDFLARE_ZONE_ID='…'
npm run hosting:photo-gate:deploy -- --apply
```

Then bake the SPA flag into Pages builds (GitHub Actions secret + `.env.local`):

```bash
VITE_EDGE_PHOTO_GATE=1
```

`PasswordGate` calls `unlockEdgePhotoGate` after a successful local JWT mint. The
UI still works if the Worker is down; JPEGs stay unprotected until the Worker is
live **and** DNS is orange-clouded.

### CI deploy (push to `main`)

[`.github/workflows/photo-gate.yml`](../.github/workflows/photo-gate.yml) runs on pushes to
`main` that touch the Worker / deploy / verify scripts (and on **Actions → Photo gate →
Run workflow**). It:

1. `npm run hosting:photo-gate:deploy -- --apply`
2. `HOSTING_VERIFY_EXPECT_PHOTO_403=1 npm run hosting:verify-edge` (sample photo must be 403 without a cookie)

**GitHub Actions secrets** (Settings → Secrets and variables → Actions):

| Secret | Required | Purpose |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | Yes | Token with Workers edit + zone read for `adubs.site` ([docs](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)) |
| `CLOUDFLARE_ACCOUNT_ID` | Yes | Account that owns the zone |
| `CLOUDFLARE_ZONE_ID` | Recommended | Pins routes when Wrangler cannot resolve `zone_name` |
| `VITE_EDGE_PHOTO_GATE` | For SPA unlock | Set to `1` so Pages builds call `/api/gate-unlock` (wired in `pages.yml`) |

Worker **runtime** secrets (`GATE_PASSWORD`, `GATE_HMAC_SECRET`, `GALLERY_JWT_SECRET`) are
**not** GitHub secrets — put them once with `wrangler secret put` (they survive code deploys).

If `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` are missing, the Photo gate workflow
**skips deploy**, runs `npm run hosting:diagnose-edge`, and exits 0 so `main` stays green
while zone/account ownership is fixed. Once secrets exist, deploy + strict verify run.

### Zone vs Worker account split (common wait state)

Symptoms:

- Cloudflare login shows Worker `adubs-photo-gate` but **Domains is empty**
- Live site still has `cf-ray` (zone lives on **another** account)
- `curl -sI` photo → **200** (not 403); `POST /api/gate-unlock` → **404/405** HTML

Fix: the account that lists **`adubs.site` under Domains** must also own the Worker.
Do not recreate the repo; reconnect zone + Worker, then set Actions secrets and re-run
**Photo gate**. Diagnose anytime:

```bash
npm run hosting:diagnose-edge
```

## Verify

```bash
npm run hosting:verify-edge
HOSTING_VERIFY_EXPECT_PHOTO_403=1 npm run hosting:verify-edge   # CI / after Worker live
curl -sI https://adubs.site/photos/still-life/color/cheers.jpg   # 403 after Worker
# unlock in browser, then:
curl -sI -b 'adubs_gate=…' https://adubs.site/photos/still-life/color/cheers.jpg
```

## Rollback notes

- DNS back to grey-cloud is painful once GitHub’s cert stops renewing — prefer
  staying proxied with SSL **Full**, or migrate origin to Cloudflare Pages.
- Delete Worker routes or `wrangler delete` to stop the photo cookie gate.
