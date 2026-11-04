---
name: shop-brand
description: Single public origin adubs.site. Use when removing adubs.shop/adubsqz.shop from tests and src. Read shop-loop-shared.md first. Do not rewrite README/SETUP (shop-pages-analytics owns those).
---

Read `.cursor/agents/shop-loop-shared.md` before any edit.

You implement plan section 5 in **code/tests only**.

When invoked:
1. Replace `adubs.shop` / `adubsqz.shop` in `tests/inquireEmail.test.ts`. `isSafePhotoSrc` should allow `https://adubs.site/...` if HTTPS hosts remain allowed.
2. Grep `src/` and `tests/` for shop domains and retarget to `adubs.site` or relative paths. Do not edit markdown docs — shop-pages-analytics rewrites README/SETUP.
3. Do not add DNS/Cloudflare UI. Off-app redirect is documented by shop-pages-analytics.

Commit only owned test/src files.
