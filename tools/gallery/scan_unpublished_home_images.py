"""Walk a filesystem tree for large raster images and report paths not on the gallery manifest.

This is a local inventory tool (not part of import). It uses basename matching against
``src/gallery-manifest.json`` — it does not open images or call remote APIs.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from collections import defaultdict
from collections.abc import Callable, Iterator
from pathlib import Path

_DEFAULT_PRUNE_NAMES = frozenset(
    {
        ".git",
        "node_modules",
        ".npm",
        ".cache",
        ".venv",
        ".venv-gallery",
        "__pycache__",
        ".Trash",
        "Caches",
        "DerivedData",
        "Pods",
        "CoreSimulator",
        ".cursor",
    }
)

_DEFAULT_PRUNE_PREFIXES: tuple[str, ...] = (
    # Heavy or irrelevant subtrees under ~ on macOS
    "Library/Application Support",
    "Library/Caches",
    "Library/Containers",
    "Library/Developer",
    "Library/Group Containers",
    "Library/Metadata",
    "Library/Mobile Documents",
    "Library/Safari",
    "Library/Photos",
)


def _is_under_rel_home(home: Path, dir_path: Path, rel_prefix: str) -> bool:
    try:
        rel = dir_path.relative_to(home)
    except ValueError:
        return False
    parts = rel.parts
    need = rel_prefix.split("/")
    if len(parts) < len(need):
        return False
    return list(parts[: len(need)]) == need


def _make_prune_predicate(
    home: Path,
    extra_prune_names: frozenset[str],
    skip_library_heavy: bool,
) -> Callable[[Path], bool]:
    names = _DEFAULT_PRUNE_NAMES | extra_prune_names

    def prune(dir_path: Path) -> bool:
        try:
            name = dir_path.name
        except OSError:
            return True
        if name in names:
            return True
        if name.endswith(".photoslibrary"):
            return True
        if name.endswith(".fcpbundle"):
            return True
        if skip_library_heavy and _is_under_rel_home(home, dir_path, "Library"):
            for prefix in _DEFAULT_PRUNE_PREFIXES:
                if _is_under_rel_home(home, dir_path, prefix):
                    return True
        return False

    return prune


def _norm_basename(path: Path) -> str:
    return path.name.lower()


def manifest_basenames(manifest_path: Path) -> set[str]:
    data = json.loads(manifest_path.read_text(encoding="utf-8"))
    out: set[str] = set()
    for _bucket, entries in data.items():
        if not isinstance(entries, list):
            continue
        for raw in entries:
            if not isinstance(raw, str):
                continue
            out.add(Path(raw).name.lower())
    return out


def iter_image_files(
    root: Path, min_bytes: int, prune_dir: Callable[[Path], bool]
) -> Iterator[Path]:
    stack: list[Path] = [root.resolve()]
    while stack:
        current = stack.pop()
        try:
            with os.scandir(current) as it:
                for entry in it:
                    try:
                        if entry.is_symlink():
                            continue
                        p = Path(entry.path)
                        if entry.is_dir(follow_symlinks=False):
                            if not prune_dir(p):
                                stack.append(p)
                            continue
                        if not entry.is_file(follow_symlinks=False):
                            continue
                        suf = p.suffix
                        if not suf:
                            continue
                        if suf.lower() not in (".jpg", ".jpeg", ".png", ".tif", ".tiff", ".webp"):
                            continue
                        if entry.stat(follow_symlinks=False).st_size >= min_bytes:
                            yield p
                    except OSError:
                        continue
        except (OSError, PermissionError):
            continue


def _fmt_mb(n: int) -> str:
    return f"{n / (1024 * 1024):.2f}"


def _path_preference(path: Path, size: int) -> tuple[int, int]:
    """Lower tier = preferred when picking one file per basename. Larger size wins as tiebreaker."""
    s = path.as_posix()
    if "/originals/" in s:
        tier = 0
    elif "/photography/" in s:
        tier = 1
    elif "/Pictures/" in s:
        tier = 2
    elif "/Downloads/" in s:
        tier = 3
    else:
        tier = 4
    return (tier, -size)


def dedupe_by_basename(hits: list[tuple[Path, int]]) -> list[tuple[Path, int]]:
    buckets: dict[str, list[tuple[Path, int]]] = defaultdict(list)
    for item in hits:
        buckets[_norm_basename(item[0])].append(item)
    out: list[tuple[Path, int]] = []
    for group in buckets.values():
        best = min(group, key=lambda t: _path_preference(t[0], t[1]))
        out.append(best)
    out.sort(key=lambda t: t[1], reverse=True)
    return out


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(
        description=(
            "Find large image files under a root (default ~) whose basenames are not listed "
            "in the gallery manifest."
        )
    )
    p.add_argument(
        "--root",
        type=Path,
        default=Path.home(),
        help="Directory to scan (default: home)",
    )
    p.add_argument(
        "--manifest",
        type=Path,
        default=None,
        help="Path to gallery-manifest.json (default: repo src/gallery-manifest.json)",
    )
    p.add_argument(
        "--min-mb",
        type=float,
        default=8.0,
        help="Minimum file size in MiB (default: 8)",
    )
    p.add_argument(
        "--full-library",
        action="store_true",
        help="Do not skip heavy ~/Library/* subtrees (very slow, may hit permissions).",
    )
    p.add_argument(
        "--dedupe-basenames",
        action="store_true",
        help="One row per filename: prefer ~/photography/originals, then ~/photography, Pictures, Downloads.",
    )
    p.add_argument(
        "--json",
        action="store_true",
        help="Emit one JSON object per line (path, size_bytes, basename).",
    )
    args = p.parse_args(argv)

    min_bytes = int(max(args.min_mb, 0) * 1024 * 1024)

    repo_root = Path(__file__).resolve().parents[2]
    manifest_path = args.manifest or (repo_root / "src" / "gallery-manifest.json")
    if not manifest_path.is_file():
        print(f"manifest not found: {manifest_path}", file=sys.stderr)
        return 2

    on_site = manifest_basenames(manifest_path)
    prune_dir = _make_prune_predicate(
        Path.home().resolve(),
        frozenset(),
        skip_library_heavy=not args.full_library,
    )

    hits: list[tuple[Path, int]] = []
    for fpath in iter_image_files(args.root.resolve(), min_bytes, prune_dir):
        if _norm_basename(fpath) in on_site:
            continue
        try:
            sz = fpath.stat().st_size
        except OSError:
            continue
        hits.append((fpath, sz))

    hits.sort(key=lambda t: t[1], reverse=True)

    raw_count = len(hits)
    if args.dedupe_basenames:
        hits = dedupe_by_basename(hits)

    if args.json:
        for fpath, sz in hits:
            line = json.dumps(
                {"path": str(fpath), "size_bytes": sz, "basename": fpath.name},
                ensure_ascii=False,
            )
            print(line)
        return 0

    print(f"Manifest: {manifest_path}")
    print(f"Root: {args.root.resolve()}  min_size: {_fmt_mb(min_bytes)} MiB")
    print(f"On-site basenames (manifest): {len(on_site)}")
    if args.dedupe_basenames:
        print(f"Candidate paths not on manifest: {raw_count} → unique basenames: {len(hits)}")
    else:
        print(f"Candidates not on manifest: {len(hits)}")
    for fpath, sz in hits:
        print(f"{_fmt_mb(sz):>10} MiB  {fpath}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
