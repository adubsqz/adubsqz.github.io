---
name: shop-loop-shared
description: Shared plan, architecture, and constraints for the inquiry-to-invoice shop loop. Every shop-loop-* agent and pages-shop-email must read this file before editing. Not a worker — context only.
---

# Shared context (read first)

You are implementing **Inquiry-to-invoice shop loop** on branch `improvement/inquiry-invoice-shop-loop-815c` in `/workspace`.

Live site: GitHub Pages at `https://adubs.site`. Instagram: `https://www.instagram.com/adubsqz/` (`INSTAGRAM_URL` in `src/site.ts`). Inbox: `adubsqz@gmail.com`. Password curtain: `sqz` (client JWT in `src/galleryJwt.ts`). Do not print the password in the UI.

## Locked commercial model

- Inquiry → quote → invoice (Zelle/Venmo and/or PayPal Invoice off-site).
- **No Stripe, no cart, no Shopify checkout.**
- Gate **stays**. Instagram **bio stays password-free**. Share `sqz` in Stories/DMs until biz cards arrive 25 Sep 2026.
- Analytics: **Cloudflare Web Analytics** (`VITE_CF_BEACON_TOKEN`), not GoatCounter, not a homemade counter.
- Production is **Pages + Cloudflare DNS**. `api/` may remain unused. Do not call Resend from the browser. Outreach uses FormSubmit / Web3Forms / mailto via `src/inquireStatic.ts` (see `pages-shop-email`).

## Architecture

```text
IG Story/DM or card → PasswordGate(sqz) → lookbook
  lightbox Request Invoice → InquiryModal (size/medium/ship-to) → FormSubmit/mailto
  quieter Licensing or hire → ContactModal
  About let's talk → ContactModal
```

Print sizes: offer a standard size only if **original** long-edge pixels cover that print at **150 PPI** (16×20 and larger) or **300 PPI** (8×10 and smaller). Never treat the 2400px web JPEG as master resolution. `custom` always offered. Missing `master_width`/`master_height` → locket, wallet, 8×10, custom.

## Fixes this loop addresses

- 15-minute JWT is hostile; cards need ~30 days.
- Gate has no path to ask for the password (add IG DM link; do not print `sqz`).
- Lightbox is generic Contact me; `InquiryModal` exists but is unwired.
- No original-scan pixel metadata; published JPEGs are already downscaled.
- About hero sells software; must lead with 35mm/MF film prints and licenses.
- `adubs.shop` / Vercel docs do not match Pages runtime.
- No visitor analytics on Pages.

## Out of scope (do not build)

Titles, editions, from-prices; Stripe; public un-gated lookbook; reconstituting gitignored `tools/`; deleting `api/`.

## File ownership (do not edit another agent's files)

| Agent | Owns exclusively |
| --- | --- |
| shop-gate | `src/galleryJwt.ts`, `src/galleryJwt.test.ts`, `src/components/PasswordGate.tsx`, `src/components/PasswordGate.test.tsx` |
| shop-invoice | `src/printSizes.ts`, `src/printSizes.test.ts`, `src/types.ts`, `src/data.ts` (manifest/photo mapping only — not `ABOUT` copy), `src/components/GalleryView.tsx`, `src/components/InquiryModal.tsx`, `src/components/InquiryModal.test.tsx`, `src/components/InquiryFlow.test.tsx`, `src/components/GalleryView.test.tsx`, `e2e/site.spec.ts` (lightbox/invoice assertions only) |
| shop-master-px | `gallery_tests/backfill_master_size.py`, `gallery_tests/test_backfill_master_size.py`, `package.json` script `gallery:backfill-master-size` only (do not strip Vercel deps) |
| shop-about | `src/components/AboutView.tsx`, `src/components/AboutView.test.tsx`, `ABOUT` strings in `src/data.ts`, About assertions in `e2e/site.spec.ts` / `e2e/smoke.spec.ts` / `src/App.test.tsx` / `src/data.test.ts` |
| shop-brand | `tests/inquireEmail.test.ts`; strip `adubs.shop` / `adubsqz.shop` from tests and `src/` only |
| shop-pages-analytics | `package.json` deps (`@vercel/analytics`, `@vercel/speed-insights`), `src/main.tsx`, `src/vite-env.d.ts`, `.env.example`, `.github/workflows/pages.yml`, `README.md`, `SETUP.md`, `AGENTS.md`, `skills/cloud-agent-starter/SKILL.md` |
| pages-shop-email | `src/inquireStatic.ts` and email submit paths; shop-invoice must reuse it, not fork |

`e2e/site.spec.ts` is split: shop-invoice owns lightbox/invoice lines; shop-about owns About copy lines. Sequential execution. If you need a file you do not own, stop and report NEEDS_CONTEXT.

## Interfaces later tasks consume

After shop-gate: `GALLERY_JWT_TTL_MS` is 30 days; gate shows Instagram DM link.

After shop-invoice: `Photo.masterWidth` / `masterHeight`; `offeredPrintSizes()` / `defaultPrintSize()` in `src/printSizes.ts`; lightbox primary **Request Invoice**.

After shop-master-px: backfill writes `master_width` / `master_height` on manifest objects; dry-run default; no photo binaries.

## Git

Work in `/workspace` on `improvement/inquiry-invoice-shop-loop-815c`. Commit only your owned files. Do not force-push. Do not edit the plan file under `/opt/cursor/artifacts/plans/`.
