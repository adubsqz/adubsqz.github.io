"""Build a curation-map JSON to probe screening + import on random originals (not yet in manifest)."""

from __future__ import annotations

import argparse
import json
import random
import re
import sys
from pathlib import Path

from gallery.config import MANIFEST_REL, repo_root
from gallery.manifest_entry import entry_token


_IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp"}


def _manifest_basenames(repo: Path) -> set[str]:
    mp = repo / MANIFEST_REL
    if not mp.is_file():
        return set()
    data = json.loads(mp.read_text(encoding="utf-8"))
    out: set[str] = set()
    for key in ("about", "bw", "color"):
        for entry in data.get(key) or []:
            try:
                tok = entry_token(entry, key)
            except ValueError:
                continue
            out.add(Path(tok).name)
    return out


def _safe_dest_basename(original: Path, seq: int) -> str:
    """Avoid digits-only / import-* basename_guard failures; keep suffix."""
    stem = re.sub(r"[^a-zA-Z0-9._-]+", "_", original.stem).strip("._") or "img"
    stem = stem[:60]
    ext = original.suffix.lower() or ".jpg"
    if ext == ".jpeg":
        ext = ".jpg"
    return f"probe-{seq:02d}-{stem}{ext}"


def _iter_images(root: Path, *, recursive: bool) -> list[Path]:
    if not root.is_dir():
        return []
    paths: list[Path] = []
    if recursive:
        for p in root.rglob("*"):
            if p.is_file() and p.suffix.lower() in _IMAGE_EXT:
                paths.append(p)
    else:
        for p in root.iterdir():
            if p.is_file() and p.suffix.lower() in _IMAGE_EXT:
                paths.append(p)
    return paths


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Emit a gallery curation map for random images under ORIGINALS not listed in gallery-manifest.",
    )
    parser.add_argument(
        "--originals",
        type=Path,
        default=Path.home() / "originals",
        help="directory of source photos (default: ~/originals)",
    )
    parser.add_argument("--count", type=int, default=8, help="how many files to pick (default 8)")
    parser.add_argument(
        "--bucket",
        choices=("bw", "color"),
        default="color",
        help="import bucket for all picked rows (default color)",
    )
    parser.add_argument("--seed", type=int, default=None, help="optional RNG seed for repeatability")
    parser.add_argument(
        "--recursive",
        action="store_true",
        help="scan ORIGINALS recursively (default: top-level files only)",
    )
    parser.add_argument(
        "--link-mode",
        choices=("copy", "symlink"),
        default="copy",
        help="publish link mode for all rows",
    )
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=None,
        help="write JSON to this path (default: print to stdout)",
    )
    args = parser.parse_args(argv)

    repo = repo_root()
    published = _manifest_basenames(repo)
    published_l = {x.lower() for x in published}

    root = args.originals.expanduser().resolve()
    candidates = [
        p
        for p in _iter_images(root, recursive=args.recursive)
        if p.name.lower() not in published_l
    ]

    if len(candidates) < args.count:
        print(
            f"draft-probe-map: only {len(candidates)} candidate(s) under {root} "
            f"(need {args.count}); try --recursive or a different folder",
            file=sys.stderr,
        )
        return 1

    rng = random.Random(args.seed)
    picked = rng.sample(candidates, args.count)

    entries = []
    for i, src_u in enumerate(picked, start=1):
        entries.append(
            {
                "source": str(src_u),
                "bucket": args.bucket,
                "link_mode": args.link_mode,
                "dest_basename": _safe_dest_basename(src_u, i),
            }
        )

    payload = {"entries": entries}
    text = json.dumps(payload, indent=2)
    text += "\n"
    if args.output:
        args.output.expanduser().resolve().parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(text, encoding="utf-8")
        print(f"draft-probe-map: wrote {args.output} ({len(entries)} row(s))", file=sys.stderr)
    else:
        sys.stdout.write(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
