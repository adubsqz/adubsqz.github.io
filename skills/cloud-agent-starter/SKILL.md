---
name: cloud-agent-starter
description: Use when Cloud agents need to set up, run, test, or debug the adubsqz photography codebase
---

# Cloud Agent Starter

## Overview

This repo is a Vite/React portfolio with Vercel Edge API routes, Playwright smoke tests, and Python gallery tooling. Start from the real script wrappers; avoid inventing feature flags or bypasses.

## First setup

- Install with `npm ci` in Cloud/CI; use `npm install` only for local package updates. CI uses Node 20.
- Do not run `npm login`; the app has no npm registry login flow.
- Do not add the Vercel CLI to `package.json`; run it through `npx vercel@latest` so CLI advisories do not pollute app audits.
- For Vercel API work, use `npx vercel@latest whoami`; if unlinked, run `npx vercel@latest login`, `npx vercel@latest link`, then `npx vercel@latest pull` before `npx vercel@latest dev`.
- Put local secrets in `.env.local`. Useful keys:
  - `GALLERY_PASSWORD`, `GALLERY_AUTH_SECRET`, optional `GALLERY_PUBLIC=1`
  - `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `INQUIRY_RECIPIENT_EMAIL`
  - Gallery tooling keys such as `GALLERY_PHOTO_PROMPT` or `GALLERY_IMPORT_SKIP_AUTO_PROMPT`
- Generate an auth secret with `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`.

## Frontend app and API routes

- Run the UI with `npm run dev`.
- Use `npx vercel@latest dev` when testing `/api/auth` or `/api/inquire`; plain Vite does not serve Vercel Edge functions.
- Build and preview with `npm run build` then `npm run preview`.
- The gallery password gate is server-side. Local missing `GALLERY_PASSWORD` is public; Vercel missing `GALLERY_PASSWORD` stays locked unless `GALLERY_PUBLIC=1`.
- There is no general feature-flag framework. Existing toggles are `VITE_E2E=1` for Playwright password-gate bypass and the gallery env vars above.

## JavaScript and React tests

- Unit/component tests: `npm run test:run`.
- Watch mode while editing: `npm run test`.
- Type checks: `npm run lint`.
- Tests use Vitest with jsdom and `src/test/setup.ts`; API/inquiry tests mock Resend or fetch instead of requiring live credentials.
- For a focused run, pass a file or name through Vitest, for example `npm run test:run -- src/components/InquiryModal.test.tsx`.

## Headless browser clicking tests

- Install Chromium once per machine with `npm run playwright:install`.
- Run headless e2e with `npm run test:e2e`; this starts Vite with `VITE_E2E=1`.
- The smoke test in `e2e/smoke.spec.ts` clicks the Gallery/About tabs. Extend this area for browser-level UI workflows.
- For debugging, use `npm run test:e2e:headed` or `npm run test:e2e:ui`.
- If Playwright reuses a server started without `VITE_E2E=1`, password-gated pages may appear. Stop the reused server or start it with `VITE_E2E=1`.

## Python gallery tooling

- Run Python tests with `npm run gallery:test`; the wrapper creates `.venv-gallery`, installs `requirements-gallery.txt`, sets `PYTHONPATH=tools`, and runs `pytest gallery_tests`.
- Check environment and repo paths with `npm run gallery:doctor`.
- Verify manifest/filesystem parity with `npm run gallery:verify`.
- For import changes, prefer `npm run gallery:import -- --map .tmp/staged-curation.json --dry-run` or `--stage-only` before publish.
- Before committing new photos under `public/photos/still-life/` or generated `src/gallery-manifest.json` changes, ask for explicit confirmation.

## CI/CD coverage

GitHub Actions runs `npm ci`, `npm run lint`, `npm run test:run`, `bash tools/run_gallery_pytest.sh -q`, `npm run gallery:verify -- --parity-only`, and `npm run build`.

CI does not currently run Playwright e2e. For UI or navigation changes, run `npm run playwright:install` and `npm run test:e2e` locally before calling the branch ready.

## Vercel Agent / deployment review

- **Vercel Agent** (project Settings → AI) reviews PRs for security, logic, and performance; enable on the linked Vercel project for automatic feedback on pushes.
- Production gallery auth is fail-closed on Vercel unless `GALLERY_PASSWORD` + `GALLERY_AUTH_SECRET` are set, or `GALLERY_PUBLIC=1` for an intentional public launch.
- API routes (`/api/auth`, `/api/inquire`) require `npx vercel@latest dev` locally; inquiry needs Resend env vars (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `INQUIRY_RECIPIENT_EMAIL`).
- After manifest or `public/photos/` changes, run `npm run gallery:verify -- --parity-only` before push (now enforced in CI).
- Gallery buckets: `bw`, `color`, `redscale`, `people`, `about` (manifest keys). UI titles: Greyscale / Full Spectrum / Redscale / People. Redscale is intentional Harman redscale work — use `GALLERY_IMPORT_SKIP_AUTO_PROMPT=1` so screening does not apply a cooler auto-prompt.

## Performance / Vercel scoring

- **Static photos** ship from `public/photos/still-life/` with long-cache headers (`vercel.json`); gallery publish caps at `GALLERY_MAX_*` (default 2400px). No Blob migration needed unless uploads go dynamic.
- **LCP**: first reel frame uses `preload` + `fetchPriority=high` + `loading=eager` in `GalleryView`; fonts load async in `index.html`.
- **JS budget**: Vite `manualChunks` splits React, Radix, and Vercel insights; About/Contact/Inquiry modals are lazy-loaded.
- **Functions**: `/api/auth` stays Edge (fast cookie check); `/api/inquire` stays Node.js (Resend SDK). Limits declared in `vercel.json`.
- **Observability**: `@vercel/analytics` + `@vercel/speed-insights` mount after main bundle via lazy `VercelInsights` chunk — check Speed Insights in the Vercel project dashboard for LCP/CLS regressions.

## Suggested verification matrix

- JS-only change: `npm run lint` and `npm run test:run`; add `npm run test:e2e` for rendered UI behavior.
- API route change: `npm run lint`, `npm run test:run`, and manual/API testing under `npx vercel@latest dev` if the handler path matters.
- Python gallery change: `npm run gallery:test` plus `npm run gallery:doctor` or `npm run gallery:verify` when paths or manifests are involved.
- Photo import workflow: dry run or stage-only import, review generated outputs, then ask before committing photos or manifest edits.
- Release-confidence sweep: CI matrix commands plus `npm run playwright:install` and `npm run test:e2e`.

## Updating this skill

When you discover a new runbook trick, env gotcha, or testing shortcut, update this file in the same PR as the code/docs change that taught it. Keep entries practical: command, when to use it, and the failure it prevents.
