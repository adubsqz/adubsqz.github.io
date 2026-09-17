# Setup Guide: Inquiry-to-invoice on GitHub Pages

Live shop: [adubs.site](https://adubs.site). Production is **GitHub Pages + Cloudflare DNS**. Do not treat Vercel, Resend, or `adubs.shop` as the live path.

## What actually runs

1. Visitor unlocks the lookbook with the client JWT gate (`src/galleryJwt.ts`).
2. Lightbox **Request Invoice** or About **let's talk** opens a form.
3. The browser submits via FormSubmit (activation hash), then Web3Forms if configured, then `mailto:adubsqz@gmail.com` (`src/inquireStatic.ts`).
4. You quote off-site (Zelle / Venmo / PayPal Invoice). There is no Stripe checkout.

`api/inquire.ts` and `api/auth.ts` are unused on Pages. `npm run dev` is the right local command.

## Environment variables

Create `.env.local` in the repo root when you need overrides. None of these are required to view the Vite UI.

| Variable | Required for Pages shop | Purpose |
| --- | --- | --- |
| `VITE_FORMSUBMIT_ID` | No (code has a default hash) | FormSubmit form id from the activation email, never the naked inbox |
| `VITE_WEB3FORMS_ACCESS_KEY` | No | Optional public Web3Forms key |
| `VITE_E2E` | Tests only | Set to `1` to skip the password gate in Playwright |
| `VITE_CF_BEACON_TOKEN` | No | Cloudflare Web Analytics beacon; GitHub Actions secret of the same name for Pages builds |
| `GALLERY_PHOTO_PROMPT` | Gallery CLI only | Absolute path to the `photo-prompt` binary |
| `GALLERY_ORIGINALS` | Backfill only | Override `~/photography/originals` when recording scan pixels |

Do not put Resend or Vercel keys in `.env` / `.env.example`. Rotate anything that was ever committed.

## Testing the inquiry flow

GitHub Actions does not send real mail. Unit tests mock FormSubmit / mailto.

1. `npm run dev`
2. Unlock the gate (or `VITE_E2E=1`)
3. Open a still → **Request Invoice**, or About → **let's talk**
4. Submit; confirm the network call goes to FormSubmit (or mailto fallback)

## Your workflow after an inquiry

1. Read the FormSubmit (or mailto) message in `adubsqz@gmail.com`
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

- Confirm FormSubmit was activated (hash in `FORMSUBMIT_FORM_ID`, not the raw gmail address as the path)
- Check the visitor confirmation copy points at *their* inbox
- Mailto fallback opens the visitor’s mail app; that is expected when remote POST fails

**Password gate in e2e?**

- Playwright must run with `VITE_E2E=1`. Stop a leftover `npm run dev` on port 5173 or start it with that env.

**Print sizes look too small?**

- The site never serves files from `originals/`. Run `npm run gallery:backfill-master-size -- --write` on a machine that has `~/photography/originals` so the manifest stores scan resolution.
