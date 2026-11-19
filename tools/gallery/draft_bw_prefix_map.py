"""Emit a curation map for images under ORIGINALS whose basename starts with bw- (not yet in manifest)."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from gallery.config import MANIFEST_REL, repo_root
from gallery.draft_probe_map import _iter_images, _manifest_basenames


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Write a gallery map JSON for bw-* images under ORIGINALS "
            "(basename prefix, case-insensitive) that are absent from gallery-manifest basenames."
        )
    )
    parser.add_argument(
        "--originals",
        type=Path,
        default=Path.home() / "originals",
        help="directory of source photos (default: ~/originals)",
    )
    parser.add_argument(
        "--recursive",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="scan originals recursively (default: true; use --no-recursive for top-level only)",
    )
    parser.add_argument(
        "--prefix",
        default="bw-",
        help='filename prefix after casefold (default: "bw-")',
    )
    parser.add_argument(
        "--bucket",
        default="bw",
        help="import bucket for every row (default: bw)",
    )
    parser.add_argument(
        "--link-mode",
        default="copy",
        help="link_mode per row (default: copy)",
    )
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        required=True,
        help="write JSON map to this path",
    )
    args = parser.parse_args(argv)

    repo = repo_root()
    published_l = {x.casefold() for x in _manifest_basenames(repo)}
    prefix_fold = args.prefix.casefold()

    root = args.originals.expanduser().resolve()
    if not root.is_dir():
        print(f"draft-bw-prefix-map: not a directory: {root}", file=sys.stderr)
        return 1

    picked: list[Path] = []
    for p in _iter_images(root, recursive=args.recursive):
        if not p.name.casefold().startswith(prefix_fold):
            continue
        if p.name.casefold() in published_l:
            continue
        picked.append(p)

    picked.sort(key=lambda x: x.as_posix().casefold())

    entries = [
        {
            "source": str(src),
            "bucket": args.bucket,
            "link_mode": args.link_mode,
            "dest_basename": src.name,
        }
        for src in picked
    ]

    payload = {"entries": entries}
    text = json.dumps(payload, indent=2) + "\n"
    outp = args.output.expanduser().resolve()
    outp.parent.mkdir(parents=True, exist_ok=True)
    outp.write_text(text, encoding="utf-8")
    print(
        f"draft-bw-prefix-map: wrote {outp} ({len(entries)} row(s)) "
        f"from {root} recursive={args.recursive}",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
