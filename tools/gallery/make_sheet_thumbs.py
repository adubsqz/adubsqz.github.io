"""Build contact-sheet thumbs under ``public/photos/sheet/`` from published stills."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from gallery.config import PUBLISH_SHEET_REL, PUBLISH_STILL_LIFE_REL, repo_root
from gallery.optimize_publish import write_sheet_thumb

IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp", ".JPG", ".JPEG", ".PNG", ".WEBP"}


def _iter_stills(still_root: Path) -> list[Path]:
    out: list[Path] = []
    if not still_root.is_dir():
        return out
    for path in sorted(still_root.rglob("*")):
        if not path.is_file():
            continue
        if path.name.startswith("."):
            continue
        if path.suffix not in IMAGE_SUFFIXES:
            continue
        out.append(path)
    return out


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="List sheet destinations without writing",
    )
    args = parser.parse_args(argv)

    repo = repo_root()
    still_root = repo / PUBLISH_STILL_LIFE_REL
    sheet_root = repo / PUBLISH_SHEET_REL
    stills = _iter_stills(still_root)
    if not stills:
        print(f"gallery-sheet-thumbs: no stills under {still_root}", file=sys.stderr)
        return 1

    written = 0
    for src in stills:
        rel = src.relative_to(still_root)
        dest = (sheet_root / rel).with_suffix(".jpg")
        if args.dry_run:
            print(f"would write {dest.relative_to(repo)}")
            continue
        write_sheet_thumb(src, dest)
        written += 1
        print(f"sheet: {dest.relative_to(repo)}")

    if args.dry_run:
        print(f"gallery-sheet-thumbs: dry-run {len(stills)} file(s)", file=sys.stderr)
    else:
        print(f"gallery-sheet-thumbs: wrote {written} thumb(s) -> {sheet_root}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
