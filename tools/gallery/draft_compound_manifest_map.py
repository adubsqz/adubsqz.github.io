"""Build a curation map: bw-* → bw, and lowercase letter-only slugs → color (not yet in manifest)."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from gallery.basename_guard import assert_allowed_publish_basename
from gallery.config import repo_root
from gallery.draft_probe_map import _iter_images, _manifest_basenames


def _safe_entries_for_color_stem(
    *,
    root: Path,
    recursive: bool,
    published_l: set[str],
    min_stem_len: int,
) -> list[dict[str, str]]:
    """Filenames like corgisunshine.jpg: stem is lowercase letters only, long enough, not in manifest."""
    out: list[dict[str, str]] = []
    for p in _iter_images(root, recursive=recursive):
        name = p.name
        fold = name.casefold()
        if fold in published_l:
            continue
        if fold.startswith("bw-"):
            continue
        stem = Path(name).stem
        if len(stem) < min_stem_len:
            continue
        if not stem.islower() or not stem.isalpha():
            continue
        try:
            assert_allowed_publish_basename(name)
        except ValueError:
            continue
        out.append(
            {
                "source": str(p),
                "bucket": "color",
                "link_mode": "copy",
                "dest_basename": name,
            }
        )
    out.sort(key=lambda r: r["dest_basename"].casefold())
    return out


def _safe_entries_bw_prefix(
    *,
    root: Path,
    recursive: bool,
    published_l: set[str],
    prefix: str,
) -> list[dict[str, str]]:
    prefix_fold = prefix.casefold()
    picked: list[Path] = []
    for p in _iter_images(root, recursive=recursive):
        fold = p.name.casefold()
        if not fold.startswith(prefix_fold):
            continue
        if fold in published_l:
            continue
        picked.append(p)
    picked.sort(key=lambda x: x.as_posix().casefold())
    return [
        {
            "source": str(src),
            "bucket": "bw",
            "link_mode": "copy",
            "dest_basename": src.name,
        }
        for src in picked
    ]


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(
        description=(
            "Write one gallery map JSON: bw-* basename prefix → bw; "
            "lowercase all-letter stems (≥ min length, e.g. corgisunshine.jpg) → color. "
            "Skips files whose basename already appears anywhere in gallery-manifest."
        )
    )
    p.add_argument(
        "--originals",
        type=Path,
        default=Path.home() / "originals",
        help="directory of source photos (default: ~/originals)",
    )
    p.add_argument(
        "--recursive",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="scan recursively (default: true)",
    )
    p.add_argument(
        "--bw-prefix",
        default="bw-",
        help='bw rows: basename prefix after casefold (default: "bw-")',
    )
    p.add_argument(
        "--human-slug-min-len",
        type=int,
        default=10,
        help="color rows: min stem length for [a-z]+ slugs (default: 10)",
    )
    p.add_argument(
        "-o",
        "--output",
        type=Path,
        required=True,
        help="write combined JSON map here",
    )
    args = p.parse_args(argv)

    repo = repo_root()
    published_l = {x.casefold() for x in _manifest_basenames(repo)}

    root = args.originals.expanduser().resolve()
    if not root.is_dir():
        print(f"draft-compound-manifest-map: not a directory: {root}", file=sys.stderr)
        return 1

    bw_rows = _safe_entries_bw_prefix(
        root=root,
        recursive=args.recursive,
        published_l=published_l,
        prefix=args.bw_prefix,
    )
    color_rows = _safe_entries_for_color_stem(
        root=root,
        recursive=args.recursive,
        published_l=published_l,
        min_stem_len=args.human_slug_min_len,
    )

    def _dedupe_by_basename(rows: list[dict[str, str]]) -> list[dict[str, str]]:
        seen_cf: set[str] = set()
        out: list[dict[str, str]] = []
        for r in rows:
            k = r["dest_basename"].casefold()
            if k in seen_cf:
                continue
            seen_cf.add(k)
            out.append(r)
        return out

    bw_rows = _dedupe_by_basename(bw_rows)
    bw_bases = {r["dest_basename"].casefold() for r in bw_rows}
    color_rows = _dedupe_by_basename(color_rows)
    color_rows = [r for r in color_rows if r["dest_basename"].casefold() not in bw_bases]

    entries = [*bw_rows, *color_rows]
    payload = {"entries": entries}
    outp = args.output.expanduser().resolve()
    outp.parent.mkdir(parents=True, exist_ok=True)
    outp.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(
        f"draft-compound-manifest-map: wrote {outp} — {len(bw_rows)} bw, {len(color_rows)} color "
        f"from {root}",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
