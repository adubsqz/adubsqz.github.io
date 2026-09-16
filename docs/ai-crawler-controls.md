# AI crawler controls

How this site keeps AI crawlers away from the photos, what the repo can and cannot do
about it, and the Cloudflare settings that back it up.

Written in response to Cloudflare's September 2026 notice replacing the single
**Block AI Bots** switch with separate **Search**, **Training**, and **Agent** controls.

## Where enforcement actually happens

Two layers, and they do different jobs:

| Layer | Mechanism | Effect |
| --- | --- | --- |
| Origin (this repo) | `public/robots.txt`, `public/.well-known/tdmrep.json`, `index.html` meta | States a preference. Only binds crawlers that choose to comply. |
| Edge (Cloudflare) | AI bot policies, AI Labyrinth, WAF | Actually blocks requests, regardless of compliance. |

The crawlers worth worrying about are the ones that ignore the first layer, so the second
layer is the one that matters. **It is currently inactive** — see below.

## What ships from this repo

GitHub Pages serves static files and cannot set response headers, so everything
origin-side is a file.

### The robots.txt file

`public/robots.txt` carries the
[Content Signals Policy](https://contentsignals.org/) verbatim, including its reservation
of rights under Article 4 of EU Directive 2019/790:

```text
User-agent: *
Content-Signal: search=yes, ai-input=no, ai-train=no, use=reference
Allow: /
Disallow: /photos/
```

Then a `Disallow: /` group for each known AI crawler, grouped by behaviour: training and
dataset collection, image-specific harvesters, answer engines, and browser-use agents.

Two details that are easy to break:

- **Conventional search crawlers deliberately have no group of their own.** Googlebot,
  Bingbot, Applebot and DuckDuckBot fall through to the `*` group. A crawler that matches
  a specific group ignores `*` **entirely** — directives are never inherited — so giving
  Googlebot its own group would silently drop the `Disallow: /photos/` and the content
  signals. `tests/crawler-controls.test.ts` asserts they stay ungrouped.
- **`Google-Extended` and `Applebot-Extended` are opt-out tokens, not crawlers.** They
  tell Google and Apple not to *train* on the site while their real crawlers keep
  indexing it. That split is what Cloudflare's "Search: Allow, Training: Disallow AI
  Training" recommendation amounts to in `robots.txt` terms.

### The TDM reservation

`public/.well-known/tdmrep.json` is the machine-readable EU opt-out from the
[W3C TDM Reservation Protocol](https://www.w3.org/community/reports/tdmrep/CG-FINAL-tdmrep-20240202/):

```json
[
  {
    "location": "/",
    "tdm-reservation": 1
  }
]
```

`index.html` carries the same signal as a `tdm-reservation` meta tag, which per the spec
supersedes the file. Vite copies the dotfile directory into `dist/` — verified, and worth
re-checking after any Vite major upgrade.

### Search visibility, the one deliberate choice

Indexing and AI access are independent. The AI posture is identical either way, so this is
purely a question of whether customers can find the shop on Google.

| Option | `robots.txt` | `index.html` robots meta | Result |
| --- | --- | --- | --- |
| Search on (current) | search crawlers use `Allow: /` | `noai, noimageai, max-image-preview:none` | Findable on Google, no AI use |
| Fully dark | unchanged, keep `Allow: /` | add `noindex` | Invisible on Google, no AI use |

Switching to fully dark is adding one token to the robots meta. Note the trap: **do not**
also `Disallow: /` for search crawlers. `Disallow` blocks crawling, so the crawler can
never fetch the page to read the `noindex`, and a URL-only listing can persist in results
from external links. Full removal needs the crawler *allowed in* to read the instruction.

Personal AI tooling is unaffected by any of this. Cursor and Claude read this repository
over git, a chat asking about a pasted URL is a user-triggered fetch rather than a
crawler, and local Ollama only sees what it is handed. Blocking crawlers costs nothing
there.

## Why the Cloudflare settings in that email do nothing today

`adubs.site` uses Cloudflare **nameservers**, but the records are **not proxied**:

```console
$ dig +short adubs.site A
185.199.110.153
185.199.109.153
185.199.108.153
185.199.111.153

$ curl -sI https://adubs.site/ | grep -iE 'server|cf-ray'
server: GitHub.com
```

GitHub Pages IPs and no `cf-ray` means requests reach GitHub directly and never traverse
Cloudflare. Every control named in that email is an edge feature, as are Transform Rules,
Configuration Rules and Origin Rules. **Toggling any of them changes nothing while the
records are grey-clouded.** `src/site.ts` records the DNS-only setup as intentional.

## Turning the proxy on

This is a real decision with a real hazard, not a toggle.

### The certificate hazard

GitHub's [`pages-health-check`](https://github.com/github/pages-health-check/blob/master/lib/github-pages-health-check/domain.rb)
gem decides HTTPS eligibility with `return false if non_github_pages_ip_present?`. Proxied
records resolve to Cloudflare addresses, so the domain becomes ineligible and **GitHub
stops renewing the Let's Encrypt certificate for `adubs.site`**. The current certificate
expires **9 December 2026**; GitHub would normally renew around early November.

Confusingly, the Pages DNS check keeps reporting success, because the same gem
short-circuits with `return true if proxied?` on a different code path. Expect **Enforce
HTTPS** to grey out in the repository settings within about a day of proxying. That is the
expected signal, not a mistake.

This is survivable, but only with the right SSL mode:

| Mode | Outcome |
| --- | --- |
| **Full** | Correct choice. Encrypts the edge-to-origin leg without validating the origin certificate, so the lapsed certificate stops mattering. |
| Full (strict) | Breaks. Fails immediately for `www` (origin presents `*.github.io`, giving error 526) and breaks the apex in December. |
| Flexible | Breaks. Cloudflare fetches over HTTP, GitHub's Enforce HTTPS redirects to HTTPS, and the request loops forever. |

Also switch **Automatic SSL/TLS** off and pin **Custom SSL/TLS = Full**. Automatic mode
ratchets toward Full (strict) on its own and never downgrades, which would break the site
on certificate expiry with no change on our side.

One live issue to fix first, independent of all this: **`https://www.adubs.site` is
already broken.** GitHub issued a certificate for the apex only, so `www` falls back to
`*.github.io` and fails name validation. Proxying incidentally repairs it, because
Cloudflare's Universal SSL covers the apex plus one subdomain level.

### Order of operations

1. While still grey-clouded, confirm in **Settings → Pages** that the custom domain is
   `adubs.site` with a green check and Enforce HTTPS is ticked. Last clean chance for
   GitHub to provision anything, including a possible `www` certificate.
2. **SSL/TLS → Overview**: switch off Automatic SSL/TLS, set Custom SSL/TLS to **Full**.
   Do this *before* proxying, so the first proxied request already has the right policy.
3. Leave HSTS and Always Use HTTPS off for now.
4. Optional insurance: a Configuration Rule setting SSL to Off or Flexible for
   `http.request.uri.path starts_with "/.well-known/acme-challenge/"`, plus a Cache Rule
   bypassing cache on that path. Configuration Rules cannot disable Always Use HTTPS, so
   if that redirect is needed later, implement it as a Single Redirect that excludes the
   ACME path.
5. Proxy the apex A records and the `www` CNAME **together**. Verify `cf-ray` and
   `server: cloudflare` appear, and that `www` finally resolves cleanly.
6. Only then enable Always Use HTTPS, and confirm no redirect loop on both hostnames.
7. Skip HSTS unless committing to stay proxied. Cloudflare warns against going back to
   DNS-only afterwards, and with the origin certificate lapsed that would be an
   unclickable-through failure.

Migrating to Cloudflare Pages removes this whole class of problem — one vendor, one
certificate, native proxying. It is the only option here without a standing 90-day failure
mode, and worth considering before investing in the workaround.

## Cloudflare settings worth enabling once proxied

All available on the Free plan. As of 15 September 2026 the new defaults apply only to
newly onboarded domains, so an existing zone keeps whatever it has and these must be set
explicitly.

### AI bot policies

**Security Settings → Configure AI bot policies.** Three behaviours, each with Block on
all pages, Block on pages with ads, or Allow.

| Behaviour | Recommended here | Reasoning |
| --- | --- | --- |
| Search | Allow | Keeps the shop findable. Matches `robots.txt`. |
| Training | Block on all pages | Cloudflare's migration default is the gentler "Disallow AI Training"; blocking outright is stricter and costs nothing, since training crawlers send no customers. |
| Agent | Block on all pages | The migration default is "Block on pages with ads" — **this site has no ads, so that setting blocks nothing.** Must be set to all pages to have any effect. |

That Agent default is the single most important item in the migration notice to check.

### Managed robots.txt

**Security Settings → Bot traffic → Set your preference to block training in robots.txt.**
Cloudflare *prepends* its managed block to the existing `public/robots.txt` rather than
replacing it, so the two compose safely. Optional, given this repo now ships an equivalent
and broader file.

### AI Labyrinth

A single opt-in toggle that feeds non-compliant crawlers plausible decoy pages instead of
blocking them outright, which also improves Cloudflare's fingerprinting of them. No
downside for a site with no legitimate automation.

### Bot Fight Mode

Free-plan variant, and it **cannot be scoped, skipped, or customised** — it runs outside
the Ruleset Engine, so WAF skip actions have no effect on it. If it ever challenges
something that matters, the only choices are off or upgrade. Enable, then watch for
false positives.

### AI Crawl Control

Per-crawler allow and block, which is the right place to allow-list any crawler there is
an actual relationship with while refusing everything else. On the Free plan, detection is
by user-agent string only and analytics are capped at a 24-hour window.

### Response headers the origin cannot send

GitHub Pages cannot set headers, so these are only possible once proxied, as a Transform
Rule (Modify Response Header). The Free plan allows 10 Transform Rules total.

| Header | Value |
| --- | --- |
| `X-Robots-Tag` | `noai, noimageai, max-image-preview:none` |
| `tdm-reservation` | `1` |

Per the TDMRep spec the header outranks both the well-known file and the meta tag, and
unlike a meta tag it also covers the JPEGs themselves.

## What none of this fixes

The photos are public static files, and no crawler policy changes that:

- All 47 photo paths are recoverable from `dist/assets/index-*.js` in a single request,
  because `src/data.ts` imports `src/gallery-manifest.json` and it gets bundled. Nothing
  needs to be guessed or enumerated.
- Roughly 37 MiB of full-resolution JPEGs under `/photos/still-life/` return HTTP 200 with
  no cookie, token, or auth header of any kind.
- `PasswordGate` is a privacy gate over the UI, as `src/galleryJwt.ts` says outright.
  Both `GALLERY_PASSWORD` and the HS256 signing secret are compiled into the shipped
  bundle, because a static host has no server to hold a secret.
- The `manifestAssetGuardPlugin` in `vite.config.ts` only registers `configureServer` and
  `configurePreviewServer` middleware, so it constrains `npm run dev` and `vite preview`
  and contributes nothing in production.

Obfuscating those paths does not help. Base64 is reversible, and any form of the path must
ship in the bundle for the browser to build an `<img>` source. Encrypting the files would
require the key in the browser, which makes it public. Browser-use agents never guess URLs
anyway: they render the page and read the resolved DOM.

Renaming to high-entropy filenames also buys nothing. The filenames are sequential
camera-roll numbers, but only manifest-listed files are deployed, so unlisted frames
already return 404 — verified against `30570007`, `30570014` and `30570015`, all absent.
Enumeration is not the exposure; the bundle is.

The only real fix is a gatekeeper in front of the bytes: images in R2 behind a Worker
checking signed, expiring URLs, or Cloudflare Access. Both need the proxy on. A cheaper
partial measure is to stop deploying full-resolution files to a public origin and publish
smaller, watermarked derivatives, keeping print-resolution masters off the web entirely.

## Verifying

Origin-side, from the repo:

```bash
npm run test:run          # includes tests/crawler-controls.test.ts
npm run build && ls dist/robots.txt dist/.well-known/tdmrep.json
```

Live, after deploy:

```bash
curl -s https://adubs.site/robots.txt | head -40
curl -s https://adubs.site/.well-known/tdmrep.json
curl -sI https://adubs.site/ | grep -iE 'cf-ray|server|x-robots-tag'
```

A `cf-ray` header appearing is the signal that the edge controls are live and the
Cloudflare dashboard settings have started to mean something.
