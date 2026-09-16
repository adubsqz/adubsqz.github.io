# adubsqz — photography

Live site: [adubs.site](https://adubs.site) (GitHub Pages).

## License and use restrictions

Copyright © 2026 Alexander Ames. All rights reserved.

This repository, the adubsqz photography portfolio, all photographs, image files, source code, visual design, written
content, metadata, and build outputs are proprietary. No copying, redistribution, modification, publication, scraping,
dataset inclusion, model training, AI/ML ingestion, embedding generation, indexing, benchmarking, or derivative use is
permitted without prior written permission.

Any print sale, image license, film/TV clearance, syndication, rental, or commercial use must be confirmed in a separate
written agreement. See [LICENSE](./LICENSE) for the full terms.

Photo-specific terms on the deployed site live in the lookbook UI (rights / licensing copy), not a separate `/PHOTO_TERMS.md` file.

## Runtime (read this first)

**Production is GitHub Pages + Cloudflare DNS at [adubs.site](https://adubs.site).** There is no Vercel production app, no `adubs.shop` origin, and no live `/api/auth` or `/api/inquire`. `api/` may remain in the repo for unused experiments; the published shop does not call it.

Inquiries go from the browser through FormSubmit (then Web3Forms, then `mailto:adubsqz@gmail.com`). See [SETUP.md](./SETUP.md).

### Password gate

The live lookbook uses a **client JWT** in `localStorage` (`src/galleryJwt.ts`), not a Vercel cookie. Visitors type the lookbook password, get a 30-day signed token, and re-enter when it expires. Share the password in Instagram Stories/DMs (or on cards), not in the Instagram bio. The UI never prints the password; the gate links to [Instagram @adubsqz](https://www.instagram.com/adubsqz/) in a new tab.

`VITE_E2E=1` skips the gate for Playwright. Do not put `GALLERY_PASSWORD` / `GALLERY_AUTH_SECRET` in README as if they were the Pages runtime — those names belong to the unused Vercel `/api/auth` path.

### www TLS

GitHub Pages custom domain must list **both** `adubs.site` and `www.adubs.site`. Apex A/AAAA → GitHub Pages IPs; `www` CNAME → `adubsqz.github.io`. Cloudflare DNS should be DNS-only (grey cloud) for those records until you intentionally proxy. Enforce HTTPS in the Pages settings after GitHub issues the cert. If `www` shows a certificate error, the Pages custom-domain list is incomplete.

## Development

```bash
npm install
npm run dev           # lookbook UI at http://localhost:5173
```

That is the production-shaped stack. You do not need `vercel dev` to click Gallery, Request Invoice, or Contact.

## Tests

- **Unit / component (Vitest):** `npm run test` or `npm run test:run`
- **E2E (Playwright):** `npm run playwright:install` once per machine, then `npm run test:e2e`

### Playwright and the password gate

Playwright starts Vite with `VITE_E2E=1`, which skips the client JWT gate.

If `reuseExistingServer` reuses a `npm run dev` you started without `VITE_E2E=1`, you will still see the password screen. Stop that server so Playwright can start one with the right env, or run `VITE_E2E=1 npm run dev` while debugging e2e.

## Build

```bash
npm run build
npm run preview
```

## Photo curation workflow

Python tooling lives under **`tools/gallery/`**. Design and contracts: **`docs/superpowers/specs/2026-04-30-gallery-pipeline-design.md`**.

Requirements:

- **`python3`** on PATH (npm scripts create **`./.venv-gallery`** automatically via the shell wrappers).
- **`bash`** (for **`tools/run_gallery_*.sh`**).

**Environment:** Gallery commands load **`.env`** then **`.env.local`** from the repo root (and from **`GALLERY_REPO_ROOT`**, when set), without overriding variables already exported in your shell. Put paths like **`GALLERY_PHOTO_PROMPT`** in **`.env.local`**.

Commands:

```bash
npm run gallery:doctor                           # resolves repo paths + photo-prompt binary hint
npm run gallery:test                             # pytest (gallery tooling)
npm run gallery:verify                           # parity + max dimensions + burn-in watermark heuristic (`--parity-only` / `GALLERY_VERIFY_SKIP_WATERMARK=1` to narrow)
npm run gallery:import -- --map YOUR_MAP.json   # optional: --dry-run, --limit N, --stage-only (HITL)
npm run gallery:promote -- --list             # human review queue → then --tokens … or --approve-all
npm run gallery:draft-probe-map -- -o .tmp/staged-curation.json   # 8 random ~/originals not in manifest
npm run gallery:backfill-master-size                             # dry-run original-scan pixels into the manifest
npm run gallery:backfill-master-size -- --write                  # write master_width/master_height only (never originals)
```

**Human-in-the-loop (`--stage-only`):** By default, **`gallery:import`** writes into **`public/`** and **`src/gallery-manifest.json`**. With **`--stage-only`**, nothing touches **`public/`** or the main manifest. Optimized files go to **`.tmp/gallery-hitl/photos/still-life/…`** (same layout as **`public/photos/still-life/`**), and **``.tmp/gallery-hitl/pending.json`** records the queue. Review those files locally, delete any you don’t want from that tree, edit **`pending.json`** if needed, then promote approved rows:

```bash
npm run gallery:import -- --map YOUR_MAP.json --stage-only
npm run gallery:promote -- --list
npm run gallery:promote -- --dry-run --tokens color/one.jpg color/two.jpg
npm run gallery:promote -- --tokens color/one.jpg color/two.jpg   # copies into public/, updates manifest, removes queue rows; deletes staged copies after success
npm run gallery:promote -- --drop-tokens color/reject.jpg          # remove from queue and delete staged file under .tmp/gallery-hitl
```

Use **`--approve-all`** only after you trust the whole queue. **`--replace`** overwrites an existing file under **`public/photos/still-life/`**. **``.tmp/review/`** is separate: short-lived copies **before** **`photo-prompt`** only; the HITL tree is the **post-process** output you inspect before going live.

**Probe screening on random originals:** `draft-probe-map` skips filenames already in **`src/gallery-manifest.json`**, assigns **`probe-NN-…`** **`dest_basename`** values (so digits-only frame names still pass **`basename_guard`**), then you can:

```bash
npm run gallery:draft-probe-map -- -o .tmp/staged-curation.json --count 8 --bucket color --seed 42
npm run gallery:import -- --map .tmp/staged-curation.json --dry-run
```

Add **`--recursive`** if scans live only under subfolders of **`~/originals`**. To use a **long creative `photo_prompt`** on specific rows, edit **`.tmp/staged-curation.json`** — map text overrides auto hints and is passed **verbatim** to **`photo-prompt`**. Remove **`--dry-run`** when ready to publish (per your usual approval for manifest/photo commits).

Maps use **`{ "entries": [ { "source", "bucket", "link_mode", "dest_basename"?, "photo_prompt"? }, … ] }`**. Sample: **`tools/gallery/examples/curation-map.sample.json`**.

- **`bucket`:** **`bw`** | **`color`** | **`redscale`** | **`people`** | **`about`** (import map; legacy **`still-life`** is accepted and maps to **`about`**). Gallery tabs are **Greyscale** / **Full Spectrum** / **Redscale** / **People**. **`about`** uses **bare filenames** in the manifest; they publish as **`public/photos/still-life/<file>`** and drive the **About** page portrait only (not a gallery category tab).
- **`link_mode`:** **`copy`** | **`symlink`**. Optimized bytes are produced under **`.tmp/optimized/`**; if **`symlink`** would point through **`.tmp`**, the importer **writes a `copy`** into **`public/`** instead and logs a short stderr note so deploys are not tied to ephemeral paths.
- **`photo_prompt`:** optional string; invokes local **`photo-prompt`** after screening (**`GALLERY_PHOTO_PROMPT`** env overrides default **`~/photo-prompt/.venv/bin/photo-prompt`** resolution). When omitted, the importer may still run **`photo-prompt`** using an **auto-generated** prompt derived from screening metrics (map text always wins when both apply).
- **`screening` (always on):** every row is evaluated on the **source file** before staging: minimum edge length, Laplacian sharpness, and conservative develop hints (shadow/highlight tails, contrast, color cast, saturation on **`color`** bucket only). Failures exit **non-zero** and do not update **`src/gallery-manifest.json`**. **`npm run gallery:import -- --dry-run …`** exits **1** if any row would fail screening (so CI can catch bad assets before publish).

  Optional tuning (env): **`GALLERY_SCREEN_MIN_EDGE`** (default **400**), **`GALLERY_SCREEN_BLUR_MIN_VAR`** (default **35**), **`GALLERY_SCREEN_LAP_MAX_EDGE`** (default **1024**), **`GALLERY_SCREEN_SHADOW_FRAC`**, **`GALLERY_SCREEN_HIGHLIGHT_FRAC`**, **`GALLERY_SCREEN_LUMA_STD_MIN`**, **`GALLERY_SCREEN_SAT_MEAN_MIN`**, **`GALLERY_SCREEN_CAST_RB`**, **`GALLERY_SCREEN_PROMPT_MAX_PARTS`** (default **8** — caps how many **auto-generated** hint fragments are joined; your long hand-written **`photo_prompt`** in the map is **never** truncated).

  Verbose map **`photo_prompt`** text (mood, film stock, “dreamlike / Pro-mist,” etc.) is fine: screening only appends short metric-based hints when the map omits **`photo_prompt`**; if you set **`photo_prompt`**, that full string is passed to **`photo-prompt`** verbatim and overrides auto hints.

**Publish step:** Before writing **`public/`**, every row passes screening, optional **`photo-prompt`** (map or auto), then **downscaling** (default max **2400×2400**, aspect preserved) and **burned-in watermark** (**`© adubsqz`** by default; default **JPEG quality 92** so typical color frames land around **~400–500KB** when the source has enough resolution). Overrides (optional env): **`GALLERY_MAX_WIDTH`**, **`GALLERY_MAX_HEIGHT`**, **`GALLERY_JPEG_QUALITY`**, **`GALLERY_WATERMARK_TEXT`**, **`GALLERY_WATERMARK_OPACITY`** (0–255), **`GALLERY_WATERMARK_POSITION`** (`bottom-right`, …), **`GALLERY_STRIP_EXIF=`** `1` to drop EXIF, **`GALLERY_SKIP_WATERMARK=1`** to re-encode **already watermarked** intermediates without a second burn-in (one-shot recovery only — prefer unwatermarked raws as **`source`**), **`GALLERY_IMPORT_SKIP_AUTO_PROMPT=1`** to run **`photo-prompt`** only when the map supplies **`photo_prompt`** (useful for pure re-encode / file-size bumps). Requires **Pillow** and **NumPy** (installed via **`requirements-gallery.txt`** / gallery npm scripts).

**Direct import (no `--stage-only`):** successful rows append to **`src/gallery-manifest.json`** and land under **`public/photos/still-life/`**. **`--stage-only`** defers manifest + **`public/`** until **`gallery:promote`**.

## More

See [SETUP.md](./SETUP.md) for the Pages inquiry path (FormSubmit / mailto) and DNS / www TLS.