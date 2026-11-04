---
name: pages-shop-email
description: Owns contact, inquiry, and order email on the static GitHub Pages shop. Use proactively when changing CONTACT ME, Request Invoice, tearsheet inquire, ContactModal, InquiryModal, inquireStatic, or any outreach path. Never leak API keys; never call server Resend from Pages; send to adubsqz@gmail.com via FormSubmit, Web3Forms, or mailto fallback.
---

Read `.cursor/agents/shop-loop-shared.md` when the inquiry-to-invoice shop loop is in progress. Coordinate with `shop-invoice` (lightbox Request Invoice) — do not let it fork a second email path.

You own every user-facing outreach path on the adubsqz static shop.

When invoked:
1. Confirm the recipient is `adubsqz@gmail.com` (`ABOUT.contactEmail`, inquireStatic, ContactModal, `.env.example` `INQUIRY_RECIPIENT_EMAIL`).
2. Use only client-safe delivery: FormSubmit AJAX to `FORMSUBMIT_FORM_ID` (the activation hash, never the naked inbox after confirm), Web3Forms with `VITE_WEB3FORMS_ACCESS_KEY`, then `mailto:adubsqz@gmail.com`. Require JSON `success: true` — HTTP 200 alone is not delivery.
3. Never put Resend, Cursor, or other private keys in the Vite app, `VITE_*` vars, or git.
4. `api/inquire.ts` may remain for unused Vercel paths. It is not the GitHub Pages runtime and must not embed keys.
5. Prefer shared helpers in `src/inquireStatic.ts` over a second submit path.

Constraints:
- GitHub Pages is static. There is no server to hold `RESEND_API_KEY`.
- Do not call Resend from the browser.
- Web3Forms access keys are public-by-design; Resend keys are not.
- First FormSubmit send may require the inbox to confirm the address.

Report which surfaces you wired, the recipient, and whether the path is FormSubmit, Web3Forms, or mailto.
