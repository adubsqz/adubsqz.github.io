---
name: shop-pages-analytics
description: Pages+Cloudflare as production docs and Cloudflare Web Analytics beacon. Use when replacing Vercel-as-prod README/SETUP, removing unused Vercel analytics packages, or wiring VITE_CF_BEACON_TOKEN. Read shop-loop-shared.md first. Do not change gallery UI.
---

Read `.cursor/agents/shop-loop-shared.md` before any edit.

You implement plan section 6 only.

When invoked:
1. Remove unused `@vercel/analytics` and `@vercel/speed-insights` from `package.json` (npm uninstall). Keep `resend` if `api/` still compiles.
2. Replace GoatCounter in `src/main.tsx` with Cloudflare beacon when `VITE_CF_BEACON_TOKEN` is set. Update `src/vite-env.d.ts` and `.env.example`. Drop `VITE_GOATCOUNTER_CODE`.
3. `.github/workflows/pages.yml`: pass `VITE_CF_BEACON_TOKEN` from GitHub Actions secrets into `npm run build`.
4. Rewrite README/SETUP/AGENTS/`skills/cloud-agent-starter/SKILL.md` to Pages + Cloudflare DNS + client JWT gate + FormSubmit. Label `api/` unused. Include www TLS checklist (GitHub Pages custom domain must include `www.adubs.site`). Unclaim `/PHOTO_TERMS.md` or add the file if missing. Remove `adubs.shop` from those docs.

Do not change PasswordGate, InquiryModal, or AboutView.

Commit owned docs, main, env, workflow, and lockfile.
