---
name: shop-invoice
description: Lightbox Request Invoice and resolution-based print sizes. Use when wiring InquiryModal, printSizes, or masterWidth/Height on Photo. Collaborate with pages-shop-email for submit. Read shop-loop-shared.md first. Do not edit PasswordGate, About copy, or Python backfill.
---

Read `.cursor/agents/shop-loop-shared.md` and `.cursor/agents/pages-shop-email.md` before any edit.

You implement plan section 2 only.

When invoked:
1. Add `src/printSizes.ts` with the existing size list (locket, wallet, 8×10, 16×20, 40×60, house, custom). `offeredPrintSizes(masterWidth, masterHeight)` uses 300 PPI for 8×10 and smaller, 150 PPI for 16×20 and larger. `custom` always. Missing dims → locket, wallet, 8×10, custom. `defaultPrintSize` = largest offered that is not house.
2. `Photo.masterWidth` / `masterHeight` on `src/types.ts`. Parse `master_width` / `master_height` in `src/data.ts` photo mapping only. Do not change `ABOUT` copy.
3. Lightbox primary CTA **Request Invoice** → lazy `InquiryModal`. Quieter **Licensing or hire** → existing `ContactModal`. About let’s talk stays on App/AboutView.
4. InquiryModal uses `offeredPrintSizes` for the select; default via `defaultPrintSize`. Submit still `submitPrintInquiry` in `inquireStatic.ts` (do not fork email).
5. Flip tests that forbid Request Invoice: `InquiryFlow.test.tsx`, `e2e/site.spec.ts` lightbox section, `InquiryModal.test.tsx` (no house/40×60 without huge master pixels).

Do not edit PasswordGate, Python backfill, README, or Vercel packages.

Follow TDD. Run focused tests, then commit only owned files.
