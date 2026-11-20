from __future__ import annotations

import argparse
import os
import re
from pathlib import Path

import numpy as np
from PIL import Image, UnidentifiedImageError

from gallery.config import PUBLISH_STILL_LIFE_REL
from gallery.manifest_entry import entry_token
from gallery.manifest_store import load_manifest
from gallery.optimize_publish import _publish_options, watermark_label_screen_rect

_IMAGE_EXT = re.compile(r"\.(jpe?g|png|webp)$", re.I)


def _truthy_env(key: str) -> bool:
    return os.environ.get(key, "").strip().lower() in ("1", "true", "yes")


def _check_publish_dimensions(path: Path, max_w: int, max_h: int) -> str | None:
    try:
        with Image.open(path) as im:
            w, h = im.size
    except (OSError, UnidentifiedImageError) as exc:
        return f"not a readable image {path.as_posix()!r}: {exc}"
    if w > max_w or h > max_h:
        return (
            f"dimensions exceed publish max ({max_w}×{max_h}) for {path.as_posix()}: "
            f"got {w}×{h} (re-run gallery import / resize+watermark)"
        )
    return None


def _check_watermark_heuristic(path: Path, opts: dict) -> str | None:
    """Heuristic: bottom-right label plate should show dark pad + bright glyphs (burn-in)."""
    try:
        with Image.open(path) as im:
            im = im.convert("RGB")
            w, h = im.size
            l, t, r, b = watermark_label_screen_rect(
                w,
                h,
                watermark_text=opts["watermark_text"],
                watermark_position=opts["watermark_position"],
            )
            crop = im.crop((l, t, r, b))
    except (OSError, UnidentifiedImageError, ValueError) as exc:
        return f"watermark check failed for {path.as_posix()!r}: {exc}"

    arr = np.asarray(crop, dtype=np.float32)
    gray = 0.299 * arr[..., 0] + 0.587 * arr[..., 1] + 0.114 * arr[..., 2]
    low_frac = float(np.mean(gray < 95.0))
    high_frac = float(np.mean(gray > 180.0))
    std = float(np.std(gray))
    if std < 8.0 or low_frac < 0.03 or high_frac < 0.015:
        return (
            f"missing or very faint burn-in watermark in label region for {path.as_posix()} "
            f"(std={std:.1f}, dark_frac={low_frac:.3f}, bright_frac={high_frac:.3f}); "
            "expected © label from optimize_publish — re-import with watermark enabled or set "
            "GALLERY_VERIFY_SKIP_WATERMARK=1 to skip this check"
        )
    return None


def verify_publish_assets(repo: Path) -> list[str]:
    """Ensure on-disk publish files match resize/watermark policy (after parity checks)."""
    errors: list[str] = []
    opts = _publish_options()
    pub = repo / PUBLISH_STILL_LIFE_REL
    allowed = _flatten_manifest_tokens(repo)

    skip_wm = _truthy_env("GALLERY_VERIFY_SKIP_WATERMARK")

    for tok in sorted(allowed):
        p = pub / tok
        if not p.is_file():
            continue
        if not _IMAGE_EXT.search(p.name):
            continue
        err = _check_publish_dimensions(p, opts["max_width"], opts["max_height"])
        if err:
            errors.append(err)
            continue
        if not skip_wm:
            err = _check_watermark_heuristic(p, opts)
            if err:
                errors.append(err)
    return errors


def _flatten_manifest_tokens(repo: Path) -> set[str]:
    data = load_manifest(repo)
    out: set[str] = set()
    for bucket, items in data.items():
        for raw in items:
            try:
                tok = entry_token(raw, bucket)
            except ValueError:
                continue
            out.add(tok)
    return out


def verify_manifest(repo: Path) -> list[str]:
    pub = repo / PUBLISH_STILL_LIFE_REL
    errors: list[str] = []
    allowed = _flatten_manifest_tokens(repo)

    for tok in sorted(allowed):
        p = pub / tok
        if not p.is_file():
            errors.append(f"missing file for manifest entry {tok!r}: expected {p}")

    # Orphan scan: every image under publish roots must appear in the manifest.
    # Covers bucket dirs (bw/color/people/…) and loose about files at the publish root.
    if pub.is_dir():
        for f in sorted(pub.rglob("*")):
            if not f.is_file():
                continue
            if f.name.startswith("."):
                continue
            if not _IMAGE_EXT.search(f.name):
                continue
            rel = f.relative_to(pub).as_posix()
            if rel not in allowed:
                errors.append(f"orphan file not listed in manifest: {rel}")

    return errors


def main(argv: list[str] | None = None) -> int:
    from gallery.config import repo_root

    p = argparse.ArgumentParser(
        description="Verify gallery-manifest.json matches public/photos/still-life "
        "and publish JPEGs/PNGs respect max dimensions + burn-in watermark (unless --parity-only)."
    )
    p.add_argument(
        "--parity-only",
        action="store_true",
        help="Only check manifest ↔ filesystem (skip resize/watermark heuristics).",
    )
    args = p.parse_args(argv)

    repo = repo_root()
    errs = verify_manifest(repo)
    if not args.parity_only:
        errs.extend(verify_publish_assets(repo))
    for e in errs:
        print(e)
    if not errs:
        print("gallery-verify: OK (manifest parity" + ("" if args.parity_only else ", dimensions, watermark heuristic") + ")")
    return 1 if errs else 0


if __name__ == "__main__":
    raise SystemExit(main())
