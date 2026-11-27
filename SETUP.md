# Setup Guide: Inquiry-to-invoice on GitHub Pages

Live shop: [adubs.site](https://adubs.site). Production is **GitHub Pages + Cloudflare DNS**. Do not treat Vercel, Resend, or `adubs.shop` as the live path.

## What actually runs

1. Visitor unlocks the lookbook with the client JWT gate (`src/galleryJwt.ts`).
2. Lightbox **Request Invoice** or About **let's talk** opens a form.
3. The browser submits via Web3Forms when `VITE_WEB3FORMS_ACCESS_KEY` is set, otherwise `mailto:adubsqz@gmail.com` (`src/inquireStatic.ts`). Mailto is also the fallback if Web3Forms fails so inquiries are never lost.
4. You quote off-site (Zelle / Venmo / PayPal Invoice). There is no Stripe checkout.

`api/inquire.ts` and `api/auth.ts` are unused on Pages. `npm run dev` is the right local command.

## Web3Forms (recommended)

FormSubmit is **not** used (it injects sponsor ads into notification emails). Use Web3Forms instead — free tier, no ads.

1. Create a free access key at [https://web3forms.com](https://web3forms.com) for **adubsqz@gmail.com**.
2. Add GitHub Actions secret `VITE_WEB3FORMS_ACCESS_KEY` (baked into Pages builds via `.github/workflows/pages.yml`).
3. For local testing, put the same key in `.env.local` as `VITE_WEB3FORMS_ACCESS_KEY=…`.

Without the key, the site still works: every inquiry falls back to `mailto:adubsqz@gmail.com`.

## Environment variables

Create `.env.local` in the repo root when you need overrides. None of these are required to view the Vite UI.

| Variable | Required for Pages shop | Purpose |
| --- | --- | --- |
| `VITE_WEB3FORMS_ACCESS_KEY` | Recommended | Public Web3Forms access key (safe for the browser). Actions secret of the same name for Pages builds |
| `VITE_E2E` | Tests only | Set to `1` to skip the password gate in Playwright |
| `VITE_CF_BEACON_TOKEN` | No | Cloudflare Web Analytics beacon; GitHub Actions secret of the same name for Pages builds |
| `VITE_EDGE_PHOTO_GATE` | No | Set to `1` (Actions secret + local) so the SPA unlocks the photo-gate cookie after orange-cloud |
| `GALLERY_PHOTO_PROMPT` | Gallery CLI only | Absolute path to the `photo-prompt` binary |
| `GALLERY_ORIGINALS` | Backfill only | Override `~/photography/originals` when recording scan pixels |

Photo-gate **Worker** deploys from [`.github/workflows/photo-gate.yml`](./.github/workflows/photo-gate.yml) on relevant `main` pushes. That job needs Actions secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` (optional `CLOUDFLARE_ZONE_ID`). Details: [hosting/AUTOMATION.md](./hosting/AUTOMATION.md).

Do not put Resend or Vercel keys in `.env` / `.env.example`. Rotate anything that was ever committed.

## Testing the inquiry flow

GitHub Actions does not send real mail. Unit tests mock Web3Forms / mailto.

1. `npm run dev` (with `VITE_WEB3FORMS_ACCESS_KEY` in `.env.local` to exercise remote submit)
2. Unlock the gate (or `VITE_E2E=1`)
3. Open a still → **Request Invoice**, or About → **let's talk**
4. Submit; confirm the network call goes to Web3Forms (or mailto fallback)

## Your workflow after an inquiry

1. Read the Web3Forms (or mailto) message in `adubsqz@gmail.com`
2. Quote from original-scan pixels in `src/gallery-manifest.json` (`master_width` / `master_height`), not the 2400px web JPEG
3. Send a Zelle / Venmo / PayPal invoice off-site

## DNS / www TLS

1. Cloudflare DNS for `adubs.site` — DNS-only (grey cloud) for GitHub Pages records
2. Apex A records to GitHub Pages IPs; `www` CNAME to `adubsqz.github.io`
3. GitHub Pages custom domain: **both** `adubs.site` and `www.adubs.site`
4. Enforce HTTPS after GitHub issues the certificate

If `www.adubs.site` shows a TLS error, add `www` on the Pages custom-domain screen.

## Troubleshooting

**Form did not reach the inbox?**

- Confirm `VITE_WEB3FORMS_ACCESS_KEY` is set as a GitHub Actions secret and that a Pages rebuild ran after adding it
- Check the visitor confirmation copy points at *their* inbox
- Mailto fallback opens the visitor’s mail app; that is expected when the key is missing or remote POST fails

**Password gate in e2e?**

- Playwright must run with `VITE_E2E=1`. Stop a leftover `npm run dev` on port 5173 or start it with that env.

**Print sizes look too small?**

- The site never serves files from `originals/`. Run `npm run gallery:backfill-master-size -- --write` on a machine that has `~/photography/originals` so the manifest stores scan resolution.
