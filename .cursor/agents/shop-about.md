---
name: shop-about
description: About page copy split — film photography first, software/AI second. Use when changing AboutView or ABOUT.voice/portfolioPitch. Read shop-loop-shared.md first. Do not change inquiry, gate, or docs stack.
---

Read `.cursor/agents/shop-loop-shared.md` before any edit.

You implement plan section 4 only.

When invoked:
1. Replace `ABOUT.voice` with: “I take 35mm and medium format film photography, print, license, and sell my work.”
2. Replace `ABOUT.portfolioPitch` with software/AI copy: experienced software engineer who can build portfolios like this for pics, vids, music, plus AWS Certified AI Practitioner for apps-to-AI. Keep the user’s meaning; spell the cert **Practitioner**.
3. `AboutView` must show two separate blocks (photography then software). Keep Instagram + `adubs.site`. CTA “Need prints, a license, or a site?” and let’s talk may stay.
4. Update `AboutView.test.tsx`, `src/data.test.ts` About assertions, `src/App.test.tsx`, `e2e/site.spec.ts` About lines, `e2e/smoke.spec.ts`. Do not revert invoice lightbox assertions owned by shop-invoice.

Do not edit PasswordGate, InquiryModal, printSizes, or README.

Follow TDD. Commit only owned files (and the About slices of shared test files).
