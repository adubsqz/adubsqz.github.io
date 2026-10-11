# Inquiry-to-invoice shop: first-dollar and scale design

**Date:** 2026-09-16
**Status:** Draft for review (evaluation only; no app code in this change)
**Constraint (locked):** Keep **inquiry → quote → invoice → Zelle/Venmo** (or a sent invoice). Do **not** add Stripe, Shopify checkout, carts, or other card-on-site checkout.

Live origin: [adubs.site](https://adubs.site). Instagram: [@adubsqz](https://www.instagram.com/adubsqz/) (227 followers, link-in-bio to adubs.site). Production host: GitHub Pages.

## Why this is a business problem, not a gallery-pipeline problem

The publish stack (screening, `photo-prompt`, watermark, Pages deploy) already scales enough to show ~47 stills. Revenue is $0 because almost nobody who does not already know you can **see work, ask for a specific print, and pay**. Extra stills, extra color science, and extra anti-scrape chrome do not fix that.

Inquiry-to-invoice is a valid commercial model. Fine-art and trade buyers often prefer a human quote. The gap is that the **inquiry is unstructured**, the **lookbook is password-gated with no public hint**, and the **About page sells software** while the tagline sells prints.

## Current commercial path (as of this evaluation)

1. Cold visitor hits a password screen. Password `sqz` is compiled into the client (`src/galleryJwt.ts`). Session lasts 15 minutes. There is no hint, request-access, or public preview.
2. Unlocked gallery is a lookbook: Greyscale / Full Spectrum / Redscale / portraits. Stills have empty captions and generated alt text (`Photograph color …`), not sale titles or SKUs.
3. Lightbox CTA is **Contact me**. That opens `ContactModal` (name, email, subject, message). Prefill is “I'd like to talk about this still…”.
4. `InquiryModal` (**Request Invoice**: size, medium, finish, shipping) still exists and has unit tests, but **nothing in the live UI imports it**. E2E (`e2e/site.spec.ts`) asserts Request Invoice is absent.
5. Delivery on Pages is FormSubmit / Web3Forms / mailto to `adubsqz@gmail.com`. `api/inquire.ts` (Resend) is unused on the live host. `SETUP.md` still documents Vercel/Resend as the production path.
6. After a yes, the operator manually invoices (copy promises Zelle/Venmo). No starting prices on the site.

`www.adubs.site` fails TLS (`NET::ERR_CERT_COMMON_NAME_INVALID`). `adubs.shop` is a different Vercel password gate (Film + TV clearance copy, Cloudflare/Vercel challenge). Instagram, the Pages shop, and the shop domain do not tell one story.

## What is already good (keep)

- Distinct lookbook (graffiti chrome, handwritten tagline, film buckets). That is the brand; do not replace it with a generic print-on-demand theme.
- Inquiry-to-invoice matches custom sizes (locket → house), licensing, and NYC/NJ hang-and-deliver without a cart SKU explosion.
- Client-side FormSubmit + mailto fallback is the right shape for static Pages (no Resend keys in the browser).
- Watermark + rights copy is enough theft deterrence for web-sized JPEGs. The password is **not** real security (it ships in JS). Treat it as a soft launch curtain, not an asset vault.

## Diagnosis: why first revenue has not happened

| Blocker | Effect on a print sale |
| --- | --- |
| Password with no public hint | Instagram traffic (the only real audience) dies on the gate. Search cannot index the lookbook. |
| 15-minute JWT | Even a warm lead re-auths mid-browse. |
| Contact me instead of Request Invoice | You get a vibe email, not size/medium/ship-to. Quote cycle is slower; buyer does more work. |
| No titles, editions, or from-prices | Buyer cannot tell if a 16×20 is $80 or $800. Inquiry-to-invoice still needs an anchor. |
| About hero is “I build portfolio sites” | Print buyers bounce; site-build leads and print leads share one CTA. |
| Brand split (`adubs.site` / `adubs.shop` / @adubsqz) | Film/TV vs prints vs software in three places. |
| No visitor analytics on Pages | GoatCounter is optional and unset; `@vercel/analytics` is unused on Pages. You cannot tell if the problem is traffic or conversion. |
| README vs runtime | Password-gate docs describe `/api/auth`; live gate is client JWT. |

## Three approaches (all keep inquiry-to-invoice)

### A — Public lookbook + structured invoice request (recommended)

Remove or hide the gate for the lookbook. Re-wire lightbox **Request Invoice** to the existing `InquiryModal`. Show human titles and a **from-price / typical size** on the inquiry (not a cart). Keep payment off-site: you send a PayPal Invoice (cards without building Stripe) and/or Zelle/Venmo for people who already know you.

- **Pros:** Matches the product you already built. Instagram link-in-bio can convert. Quotes have the fields you need. No checkout integration.
- **Cons:** Stills are public (already true for anyone who views source or knows `sqz`). You will get some low-quality emails.

### B — Keep the gate; make Instagram the storefront

Leave `adubs.site` private. Put 6–12 titled stills + “DM or email for an invoice” on Instagram and a one-page public landing (no password) with those stills and one Request Invoice form.

- **Pros:** Preserves the “private lookbook” feeling.
- **Cons:** 227 followers is a small paid audience. A password with no hint currently **breaks** this funnel. You still need structured inquiries.

### C — Two businesses, two URLs

Prints + licenses stay on `adubs.site`. “I build portfolio sites” moves to a separate page/domain. Film/TV clearance either lives as a trade PDF + email, or on `adubs.shop` with a **redirect and one password story**, not a second unexplained gate.

- **Pros:** Stops mixed CTAs.
- **Cons:** More properties to maintain. Do this as copy/IA, not a new app, until prints make money.

**Recommendation:** **A**, with a slice of **C** (About copy: photographer first; site-building as a second paragraph, not the hero). Do not do **B** unless you put the password in the Instagram bio **today**; otherwise the gate is just lost traffic.

## Target commercial loop (no checkout)

```text
see still (IG or public lookbook)
  → Request Invoice (photo + size + medium + ship-to + notes)
    → you reply with quote + terms (24h)
      → PayPal Invoice and/or Zelle/Venmo
        → you fulfill (lab or local print) + optional NYC/NJ hang
```

Scale for this model is **more qualified inquiries and faster, repeatable quotes**, not more SKUs in a cart. A workable month is 8–15 structured inquiries and 1–3 paid invoices—not 47 more stills.

## In-app work (only if this spec is approved)

Priority order. Each item is independently shippable. None of these is Stripe.

1. **Decide the gate.** Default recommendation: public lookbook. If a curtain stays, print the password on the gate and in the Instagram bio, and extend JWT TTL from 15 minutes to at least 7 days. The current secret is not a secret.
2. **Re-wire Request Invoice.** Lightbox primary CTA → `InquiryModal`. Keep Contact me as secondary (questions / licenses / site-builds). Shipping address stays required for prints; make it optional if the inquiry type is license-only.
3. **Sale metadata.** Human `title` (and optional `from_price`, `edition`) on manifest rows; show them in the lightbox and inquiry. Stop selling `Photograph bw 000220500009-otter`.
4. **From-prices as quote anchors.** Example: “16×20 fine-art paper typically $X–$Y; I’ll confirm on the invoice.” Not a cart total. Drop or bury house-size (8×10 ft) until a lab can actually produce it; keep it as custom notes.
5. **About for print buyers.** Lead with film photography in NYC, prints and licenses, Instagram. Move the software-engineer / “dream app” / portfolio-site pitch below the fold.
6. **Ops honesty in docs.** Pages + FormSubmit is production. Vercel/Resend is optional future. `PHOTO_TERMS.md` is linked from README and 404s on the live host—publish it or stop claiming it.
7. **Fix `www.adubs.site` TLS** (GitHub Pages custom domain / Cloudflare DNS). Point `adubs.shop` at the same story or a single redirect so Instagram and word-of-mouth cannot land on a second black password wall.
8. **Turn on GoatCounter** (`VITE_GOATCOUNTER_CODE`) so you know whether the next problem is traffic or form drop-off.
9. **Do not tighten anti-copy chrome.** Right-click / DevTools blockers do not stop theft of 2400px JPEGs and they fight legitimate copy-paste in the inquiry form.

Out of scope until after first paid invoice: Stripe, Shopify, Etsy as the store, Blob/CDN migrations, more gallery buckets, ML color tooling.

## Off-app work (this is most of the first dollar)

These do more for revenue than more React.

1. **Instagram as demand, site as closer.** Bio: what you sell + `adubs.site` (and password if the gate stays). Captions: still title + “request an invoice on the site.” 227 followers will not pay if the link is a blank password field.
2. **One invoice instrument besides Zelle/Venmo.** [PayPal Invoicing](https://www.paypal.com/us/business/accept-payments/invoice) is not a site checkout: you email an invoice; they pay card/PayPal; no Stripe on adubs.site. Use Zelle/Venmo for people who already trust you. PayPal’s own figures claim most invoices are paid within a day of send; there is no fee to send, only a processing fee if they pay through PayPal.
3. **One fulfillment partner.** Pick a lab (NYC local or a mailer like a fine-art printer) for 8×10 and 16×20 on paper. Time a test print of your best three stills so the first invoice is not your first production experiment. House-size and metal/acrylic stay “custom, I’ll quote.”
4. **Eight hero SKUs, not 47 anonymous files.** Title them. Put those eight on Instagram and, if you keep a gate, on a public strip. Trade tearsheet PDF (the copy already promises this) emailed to interior people and set PAs beats Film + TV legal poetry on a password wall.
5. **In-person NYC/NJ.** Friends’ apartments, one café wall, one market, one interior designer. Inquiry-to-invoice shines when someone has already seen a print in the room. The site then takes the order details.
6. **Separate the software offer.** If you want paid site-builds, a single sentence + Calendly/email is enough. Do not make it the About hero while the tagline is selling lockets and house-size prints.
7. **When money actually moves:** sole prop vs LLC, NY sales tax on physical prints, a simple invoice template with inquiry code, size, medium, rights granted, and deposit vs balance. Not before the first yes.

## Success criteria (first 90 days of operating this way)

- A stranger from Instagram can reach a titled still and submit **Request Invoice** without DMing you for a password.
- You can quote from the email body without a back-and-forth for size/medium/address.
- You have a saved PayPal Invoice (or equivalent) template and a lab that has printed at least one of your files.
- GoatCounter (or equivalent) shows visits; you know whether a quiet week is “no traffic” or “traffic, no inquiries.”
- About page reads as a photographer who also codes, not a developer who also has a gallery.

## Sources

- Live walkthrough of [adubs.site](https://adubs.site), [www.adubs.site](https://www.adubs.site), [adubs.shop](https://adubs.shop), and [instagram.com/adubsqz](https://www.instagram.com/adubsqz/) (2026-09-16).
- [PayPal Invoicing](https://www.paypal.com/us/business/accept-payments/invoice) (retrieved 2026-09-16): send-invoice, pay-by-link, no customer PayPal account required; processing fees on receipt.
- Repo: `src/galleryJwt.ts`, `src/components/GalleryView.tsx`, `src/components/InquiryModal.tsx`, `src/inquireStatic.ts`, `e2e/site.spec.ts`, `SETUP.md`.
