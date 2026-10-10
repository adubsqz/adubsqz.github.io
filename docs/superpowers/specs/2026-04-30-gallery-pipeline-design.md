# Gallery pipeline and curation redesign

**Date:** 2026-04-30  
**Status:** Approved for implementation planning

## Principles

1. **Human-declared buckets** — The author specifies `bw`, `color`, or `still-life` (manifest keys) plus `symlink` vs `copy` per asset. No automatic monochrome vs colour inference.
2. **Human-declared editing** — Optional `photo-prompt` passes use explicit natural-language instructions (CLI invocation). Omit when there are no edits.
3. **Manifest as publish contract (model B)** — `src/gallery-manifest.json` lists **only** assets that are fully published and intentional. Incomplete work stays out until the importer commits a row after a successful pipeline run.
4. **Python owns automation** — Curation import, verification, `.gitignore` sync, and related tooling are implemented as Python scripts. **No `.mjs` gallery scripts.**

## NPM surface

Short `**npm run …`** commands remain as **thin wrappers** around Python (dispatch only). Logic lives under `**tools/gallery/`** (import package `**gallery**` with `**PYTHONPATH=tools**`).

**Build:** Production build is `**vite build` only**. Any future “prune shipped gallery” behaviour belongs in the Python publish/verify tooling or documented manual steps—not a separate Node build step unless required for unrelated reasons.

## Pipeline (map-driven orchestrator)

Preferred primary flow: **one Python entrypoint** reading a **curation map** (JSON or YAML) with rows such as:

- `source` — path to the original asset (repo-relative or absolute).
- `bucket` — `bw` | `color` | `still-life` (aligned with manifest categories).
- `link_mode` — `symlink` | `copy`.
- `photo_prompt` — optional string passed to `**photo-prompt`**; absent or empty means **no adjustment step**.

Execution order per row:

1. Validate readable image input.
2. Stage into authoring temp paths (e.g. `.tmp/review/`, optionally `.tmp/edited/`).
3. If `photo_prompt` set: subprocess to `**photo-prompt`** → deterministic output path.
4. Publish into `**public/photos/still-life/`** with relative paths that match the manifest (e.g. `bw/slug.jpg`, `color/slug.jpg`) so they align with existing `resolveGalleryImagePath` and the Vite manifest guard on `/photos/still-life/`.
5. Update `**gallery-manifest.json` only after** that row succeeds end-to-end.
6. Optionally run **verify manifest** + **gallery ignore sync** (Python), exposed via npm wrappers for CI ergonomics.

**Collision policy** — fail fast on basename conflicts unless the design phase picks a deterministic rename convention (document explicitly in implementation).

## Frontend / runtime

- `**src/data.ts`** continues to derive `**COLLECTIONS`** from `**gallery-manifest.json**`. Entries under `bw/`, `color/`, `redscale/`, and `people/` are one contact sheet. Defensive guards (unsupported filenames / paths) may remain optional; malformed rows should preferably never reach manifest thanks to `**verify**` in Python.

## Verification

- `**verify**` checks filesystem ↔ manifest parity (no orphaned files beneath published roots; no manifest rows pointing at missing files).
- Optionally enforce allowed filename patterns aligned with authoring rules.

## Maid service (this reset)

Purpose: Remove repo surface area that referenced **removed Node gallery scripts**, **ML-heavy devDependencies**, **obsolete workflow documentation**, **copy that assumed auto-classification scripts**, and **tests that implicitly required a populated gallery.** The app **must tolerate an empty canonical manifest** (fresh start) while preserving password gate, inquiry API, Vitest e2e smoke, and `vite build` in CI.

Delivered in the same hygiene pass as aligning `package.json` and README with **Python-forward** tooling (no dangling `node scripts/*.mjs`).

## Next step

Implementation plan via `**writing-plans`** skill (tasks, ordering, CI updates when Python wrappers land).

## Update: screening + auto prompts (2026-05)

Shipped: `**tools/gallery/screen_asset.py`** runs on every import row before staging. Hard rejects: minimum edge, Laplacian sharpness. Soft signals become a conservative combined prompt when `**photo_prompt**` is omitted; map text overrides. `**npm run gallery:import -- --dry-run**` exits **1** if any row would fail screening.

## Update: HITL staging (`--stage-only`) + `gallery:promote` (2026-05)

Optional `**--stage-only**` writes optimized bytes to `**.tmp/gallery-hitl/photos/still-life/**` and `**pending.json**` only; `**public/**` and `**src/gallery-manifest.json**` stay untouched until `**npm run gallery:promote**` (`--list`, `**--tokens**`, `**--approve-all**`, `**--drop-tokens**`).