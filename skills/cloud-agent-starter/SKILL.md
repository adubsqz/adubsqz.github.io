---
name: cloud-agent-starter
description: Use when Cloud agents need to set up, run, test, or debug the adubsqz photography codebase
---

# Cloud Agent Starter

## Overview

This repo is a Vite/React lookbook on **GitHub Pages** (adubs.site), with Playwright smoke tests and Python gallery tooling. Production does not use Vercel. Start from the real script wrappers; avoid inventing feature flags or bypasses.

## First setup

- Install with `npm ci` in Cloud/CI; use `npm install` only for local package updates. CI uses Node 20.
- Do not run `npm login`; the app has no npm registry login flow.
- Do not add the Vercel CLI to `package.json`. You do not need `vercel dev` to exercise the live shop.
- Put local secrets in `.env.local`. Useful keys:
  - Gallery tooling: `GALLERY_PHOTO_PROMPT`, `GALLERY_ORIGINALS`, `GALLERY_IMPORT_SKIP_AUTO_PROMPT`
  - Optional inquiry overrides: `VITE_FORMSUBMIT_ID`, `VITE_WEB3FORMS_ACCESS_KEY`
- `VITE_E2E=1` skips the client JWT password gate for Playwright.

## Frontend app

- Run the UI with `npm run dev` (password gate, Request Invoice, Contact).
- Build and preview with `npm run build` then `npm run preview`.
- The live gate is a client JWT in `localStorage` (`src/galleryJwt.ts`), not `/api/auth`.
- Inquiry submit is FormSubmit / Web3Forms / mailto (`src/inquireStatic.ts`). `api/` is unused on Pages.
- There is no general feature-flag framework. Existing toggle: `VITE_E2E=1`.

## JavaScript and React tests

- Unit/component tests: `npm run test:run`.
- Watch mode while editing: `npm run test`.
- Type checks: `npm run lint`.
- Tests use Vitest with jsdom and `src/test/setup.ts`. Inquiry tests mock FormSubmit or mailto; they do not need Resend.
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
- Record original-scan pixels (not web JPEG pixels) with `npm run gallery:backfill-master-size` (add `--write` on a machine that has `~/photography/originals`). Never overwrite masters; never commit photo binaries without approval.
- For import changes, prefer `npm run gallery:import -- --map .tmp/staged-curation.json --dry-run` or `--stage-only` before publish.
- Before committing new photos under `public/photos/still-life/` or generated `src/gallery-manifest.json` changes, ask for explicit confirmation.

## CI/CD coverage

GitHub Actions runs `npm ci`, `npm run lint`, `npm run test:run`, gallery pytest when the wrapper exists, `npm run gallery:verify -- --parity-only`, and `npm run build`.

CI does not currently run Playwright e2e. For UI or navigation changes, run `npm run playwright:install` and `npm run test:e2e` locally before calling the branch ready.

## Pages deployment

- GitHub Actions deploys `dist/` to Pages. Custom domain: `adubs.site` **and** `www.adubs.site`.
- Cloudflare DNS: grey-cloud A/AAAA for apex, `www` CNAME to `adubsqz.github.io`.
- After manifest or `public/photos/` changes, run `npm run gallery:verify -- --parity-only` before push.
- Gallery buckets: `bw`, `color`, `redscale`, `people`, `about` (manifest keys). UI titles: Greyscale / Full Spectrum / Redscale / People.

## Suggested verification matrix

- JS-only change: `npm run lint` and `npm run test:run`; add `npm run test:e2e` for rendered UI behavior.
- Inquiry/contact change: `npm run lint`, `npm run test:run` (FormSubmit mocks); e2e if the dialog flow changed.
- Python gallery change: `npm run gallery:test` plus `npm run gallery:doctor` or `npm run gallery:verify` when paths or manifests are involved.
- Photo import workflow: dry run or stage-only import, review generated outputs, then ask before committing photos or manifest edits.
- Release-confidence sweep: CI matrix commands plus `npm run playwright:install` and `npm run test:e2e`.

## Updating this skill

When you discover a new runbook trick, env gotcha, or testing shortcut, update this file in the same PR as the code/docs change that taught it. Keep entries practical: command, when to use it, and the failure it prevents.
