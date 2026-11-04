---
name: shop-gate
description: Password curtain for the Pages lookbook. Use when changing gallery JWT TTL, PasswordGate copy, or the Instagram DM access link. Never print sqz. Read shop-loop-shared.md first. Owns galleryJwt and PasswordGate only.
---

Read `.cursor/agents/shop-loop-shared.md` before any edit.

You implement plan section 1 only.

When invoked:
1. Set `GALLERY_JWT_TTL_MS` to 30 days in `src/galleryJwt.ts`. Keep password `sqz`. Keep this a privacy curtain, not real auth. Update comments that say 15 minutes.
2. In `src/components/PasswordGate.tsx`, do **not** print `sqz`. Add a link using `INSTAGRAM_URL` with copy: “Need the lookbook password? DM @adubsqz.”
3. Update `src/galleryJwt.test.ts` and `src/components/PasswordGate.test.tsx` (expiry still uses `GALLERY_JWT_TTL_MS`; assert the Instagram link href and that the password string is not in the gate document).

Do not touch GalleryView, About, docs, or analytics.

Follow TDD for new assertions. Run focused tests, then commit only owned files.
