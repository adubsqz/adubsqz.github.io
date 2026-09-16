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
    original_path: str
    master_bytes: int


@dataclass
class BackfillResult:
    updates: list[MasterUpdate] = field(default_factory=list)
    unmatched: list[str] = field(default_factory=list)
    ambiguous: list[str] = field(default_factory=list)
    wrote: bool = False


def originals_dir() -> Path:
    for candidate in candidate_originals_dirs():
        if candidate.is_dir():
            return candidate
    env = os.environ.get("GALLERY_ORIGINALS", "").strip()
    if env:
        return Path(env).expanduser().resolve()
    return Path.home() / "photography" / "originals"


def candidate_originals_dirs() -> list[Path]:
    """Look for an originals tree without guessing filenames.

    Recursion into the tree happens in ``_index_originals``. This only picks
    the root: ``$GALLERY_ORIGINALS``, then ``~/photography/originals``,
    ``~/originals``, and ``<repo>/originals``.
    """
    seen: list[Path] = []
    env = os.environ.get("GALLERY_ORIGINALS", "").strip()
    if env:
        seen.append(Path(env).expanduser().resolve())
    home = Path.home()
    seen.append((home / "photography" / "originals").resolve())
    seen.append((home / "originals").resolve())
    seen.append((repo_root() / "originals").resolve())
    unique: list[Path] = []
    for path in seen:
        if path not in unique:
            unique.append(path)
    return unique


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
    """Treat duplicate copies of the same scan as one original.

    Recursive ``originals/`` trees often keep the same Noritsu file in two
    folders. Same inode or same pixel size → pick one path. Different pixel
    sizes stay ambiguous so we do not guess which master to trust.
    """
    ordered: list[Path] = []
    seen: set[Path] = set()
    for path in hits:
        if path not in seen:
            seen.add(path)
            ordered.append(path)
    if not ordered:
        return None
    if len(ordered) == 1:
        return ordered[0]

    resolved: list[Path] = []
    seen_res: set[Path] = set()
    for path in ordered:
        res = path.resolve()
        if res not in seen_res:
            seen_res.add(res)
            resolved.append(path)
    if len(resolved) == 1:
        return resolved[0]

    by_size: dict[tuple[int, int], list[Path]] = {}
    for path in resolved:
        by_size.setdefault(_read_size(path), []).append(path)
    if len(by_size) != 1:
        return "ambiguous"
    copies = next(iter(by_size.values()))
    return min(copies, key=lambda path: (len(path.parts), path.as_posix().lower()))


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


def _original_relpath(original: Path, originals_root: Path) -> str:
    try:
        return original.resolve().relative_to(originals_root.resolve()).as_posix()
    except ValueError:
        return original.name


def _to_positive_int(value: object) -> int | None:
    if isinstance(value, bool) or not isinstance(value, int):
        return None
    if value <= 0:
        return None
    return value


def publish_still_path(repo: Path, token: str) -> Path:
    return repo / "public" / "photos" / "still-life" / token


def check_rendered_knows_originals(
    *,
    manifest_path: Path,
    originals: Path,
    repo: Path,
    require_original_match: bool | None = None,
) -> list[str]:
    """Every published still must record original path + scan resolution.

    Master pixels must be the original scan, never the downscaled web JPEG.
    When ``originals`` exists, dest basenames are matched recursively under that
    tree. Missing originals only skip the match requirement.
    """
    errors: list[str] = []
    if not manifest_path.is_file():
        return [f"manifest not found: {manifest_path}"]

    payload = json.loads(manifest_path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        return [f"manifest must be a JSON object: {manifest_path}"]

    originals_exist = originals.is_dir()
    must_match = originals_exist if require_original_match is None else require_original_match
    by_name, by_stem = _index_originals(originals) if originals_exist else ({}, {})

    for bucket in MANIFEST_BUCKETS:
        rows = payload.get(bucket)
        if not isinstance(rows, list):
            continue
        for row in rows:
            token = _row_token(row)
            if token is None:
                continue
            published = publish_still_path(repo, token)
            if not published.is_file():
                errors.append(f"{token}: missing published still {published}")
                continue
            pub_w, pub_h = _read_size(published)
            row_obj = row if isinstance(row, dict) else {}
            master_w = _to_positive_int(row_obj.get("master_width"))
            master_h = _to_positive_int(row_obj.get("master_height"))
            original_path = row_obj.get("original_path") if isinstance(row_obj, dict) else None
            master_bytes = _to_positive_int(row_obj.get("master_bytes"))

            matched = match_original(Path(token).name, by_name, by_stem) if originals_exist else None
            if matched == "ambiguous":
                errors.append(f"{token}: ambiguous original under {originals}")
                continue

            if isinstance(matched, Path):
                orig_w, orig_h = _read_size(matched)
                orig_bytes = int(matched.stat().st_size)
                rel = _original_relpath(matched, originals)
                if master_w != orig_w or master_h != orig_h:
                    errors.append(
                        f"{token}: master {master_w}x{master_h} != original {orig_w}x{orig_h} at {rel}"
                    )
                if original_path != rel:
                    errors.append(
                        f"{token}: original_path {original_path!r} != recursive match {rel!r}"
                    )
                if master_bytes != orig_bytes:
                    errors.append(
                        f"{token}: master_bytes {master_bytes!r} != original size {orig_bytes} at {rel}"
                    )
                if master_w is not None and master_h is not None and (
                    master_w < pub_w or master_h < pub_h
                ):
                    errors.append(
                        f"{token}: master {master_w}x{master_h} is smaller than published {pub_w}x{pub_h}"
                    )
                continue

            if must_match:
                errors.append(f"{token}: no original found recursively under {originals}")
                continue

            if master_w is not None and master_h is not None and (
                master_w < pub_w or master_h < pub_h
            ):
                errors.append(
                    f"{token}: master {master_w}x{master_h} is smaller than published {pub_w}x{pub_h}"
                )

    return errors


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
            original_path = _original_relpath(matched, originals)
            master_bytes = int(matched.stat().st_size)
            result.updates.append(
                MasterUpdate(
                    path=token,
                    master_width=width,
                    master_height=height,
                    original=matched,
                    original_path=original_path,
                    master_bytes=master_bytes,
                )
            )
            if isinstance(row, dict):
                updated = dict(row)
            else:
                updated = {"path": token}
            updated["master_width"] = width
            updated["master_height"] = height
            updated["original_path"] = original_path
            updated["master_bytes"] = master_bytes
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
            f"  {update.path}: {update.master_width}x{update.master_height} "
            f"{update.master_bytes}B <- {update.original_path}"
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
