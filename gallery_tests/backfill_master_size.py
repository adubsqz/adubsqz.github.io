#!/usr/bin/env python3
"""Backfill gallery-manifest.json master_width/master_height from original scans.

Dry-run by default. ``--write`` updates JSON metadata only — never originals,
never photo binaries.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import dataclass, field
from pathlib import Path

from PIL import Image

IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".webp"}
MANIFEST_BUCKETS = ("about", "bw", "color", "redscale", "people")


@dataclass(frozen=True)
class MasterUpdate:
    path: str
    master_width: int
    master_height: int
    original: Path


@dataclass
class BackfillResult:
    updates: list[MasterUpdate] = field(default_factory=list)
    unmatched: list[str] = field(default_factory=list)
    ambiguous: list[str] = field(default_factory=list)
    wrote: bool = False


def originals_dir() -> Path:
    env = os.environ.get("GALLERY_ORIGINALS", "").strip()
    if env:
        return Path(env).expanduser().resolve()
    return Path.home() / "photography" / "originals"


def repo_root() -> Path:
    env = os.environ.get("GALLERY_REPO_ROOT", "").strip()
    if env:
        return Path(env).expanduser().resolve()
    here = Path(__file__).resolve().parent.parent
    if (here / "src" / "gallery-manifest.json").is_file():
        return here
    return Path.cwd().resolve()


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Read original-scan pixel sizes with Pillow and record them on "
            "gallery-manifest.json objects. Dry-run unless --write. Never "
            "overwrites files under the originals directory."
        )
    )
    parser.add_argument(
        "--write",
        action="store_true",
        help="Write master_width/master_height into the manifest JSON only.",
    )
    parser.add_argument(
        "--manifest",
        type=Path,
        default=None,
        help="Path to gallery-manifest.json (default: <repo>/src/gallery-manifest.json).",
    )
    parser.add_argument(
        "--originals",
        type=Path,
        default=None,
        help="Originals root (default: $GALLERY_ORIGINALS or ~/photography/originals).",
    )
    return parser.parse_args(argv)


def _is_image(path: Path) -> bool:
    return path.is_file() and path.suffix.lower() in IMAGE_SUFFIXES


def _index_originals(root: Path) -> tuple[dict[str, list[Path]], dict[str, list[Path]]]:
    by_name: dict[str, list[Path]] = {}
    by_stem: dict[str, list[Path]] = {}
    for path in root.rglob("*"):
        if not _is_image(path):
            continue
        by_name.setdefault(path.name.lower(), []).append(path)
        by_stem.setdefault(path.stem.lower(), []).append(path)
    return by_name, by_stem


def _unique_or_ambiguous(hits: list[Path]) -> Path | str | None:
    if len(hits) == 1:
        return hits[0]
    if len(hits) > 1:
        return "ambiguous"
    return None


def match_original(
    dest_basename: str,
    by_name: dict[str, list[Path]],
    by_stem: dict[str, list[Path]],
) -> Path | str | None:
    """Match dest basename to an original file.

    Prefers unique case-insensitive basename, then unique stem (any suffix),
    then unique longest original stem that is a hyphen prefix of the dest stem
    (``30570008.jpg`` → dest ``30570008-kiln.JPG``).
    """
    name_hit = _unique_or_ambiguous(by_name.get(dest_basename.lower(), []))
    if name_hit is not None:
        return name_hit

    dest_stem = Path(dest_basename).stem.lower()
    stem_hit = _unique_or_ambiguous(by_stem.get(dest_stem, []))
    if stem_hit is not None:
        return stem_hit

    prefix_hits: list[tuple[int, Path]] = []
    for orig_stem, paths in by_stem.items():
        if dest_stem.startswith(orig_stem + "-"):
            for path in paths:
                prefix_hits.append((len(orig_stem), path))
    if not prefix_hits:
        return None
    longest = max(length for length, _ in prefix_hits)
    longest_paths = [path for length, path in prefix_hits if length == longest]
    unique = list(dict.fromkeys(longest_paths))
    return _unique_or_ambiguous(unique)


def _row_token(row: object) -> str | None:
    if isinstance(row, str):
        token = row.strip()
        return token or None
    if isinstance(row, dict):
        raw = row.get("path")
        if isinstance(raw, str) and raw.strip():
            return raw.strip()
    return None


def _read_size(path: Path) -> tuple[int, int]:
    with Image.open(path) as image:
        width, height = image.size
    return int(width), int(height)


def backfill_master_size(
    *,
    manifest_path: Path,
    originals: Path,
    write: bool = False,
) -> BackfillResult:
    result = BackfillResult()
    if not originals.is_dir():
        return result

    by_name, by_stem = _index_originals(originals)
    payload = json.loads(manifest_path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"manifest must be a JSON object: {manifest_path}")

    changed = False
    for bucket in MANIFEST_BUCKETS:
        rows = payload.get(bucket)
        if not isinstance(rows, list):
            continue
        new_rows: list[object] = []
        for row in rows:
            token = _row_token(row)
            if token is None:
                new_rows.append(row)
                continue
            dest = Path(token).name
            matched = match_original(dest, by_name, by_stem)
            if matched == "ambiguous":
                result.ambiguous.append(token)
                new_rows.append(row)
                continue
            if matched is None:
                result.unmatched.append(token)
                new_rows.append(row)
                continue
            width, height = _read_size(matched)
            result.updates.append(
                MasterUpdate(
                    path=token,
                    master_width=width,
                    master_height=height,
                    original=matched,
                )
            )
            if isinstance(row, dict):
                updated = dict(row)
            else:
                updated = {"path": token}
            updated["master_width"] = width
            updated["master_height"] = height
            new_rows.append(updated)
            changed = True
        payload[bucket] = new_rows

    if write and changed:
        manifest_path.write_text(
            json.dumps(payload, indent=2) + "\n",
            encoding="utf-8",
        )
        result.wrote = True
    return result


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    originals = Path(args.originals).expanduser() if args.originals else originals_dir()
    manifest = (
        Path(args.manifest).expanduser()
        if args.manifest
        else repo_root() / "src" / "gallery-manifest.json"
    )
    if not manifest.is_file():
        print(f"manifest not found: {manifest}", file=sys.stderr)
        return 1

    result = backfill_master_size(
        manifest_path=manifest,
        originals=originals,
        write=bool(args.write),
    )
    mode = "write" if args.write else "dry-run"
    print(f"{mode}: originals={originals} manifest={manifest}")
    for update in result.updates:
        print(
            f"  {update.path}: {update.master_width}x{update.master_height} <- {update.original}"
        )
    for token in result.unmatched:
        print(f"  unmatched: {token}")
    for token in result.ambiguous:
        print(f"  ambiguous: {token}")
    if args.write:
        print(f"wrote={result.wrote} updates={len(result.updates)}")
    else:
        print(f"dry-run updates={len(result.updates)} (pass --write to record JSON only)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
