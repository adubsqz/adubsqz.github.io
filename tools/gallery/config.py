from __future__ import annotations

import os
from pathlib import Path

MANIFEST_REL = Path("src/gallery-manifest.json")
PUBLISH_STILL_LIFE_REL = Path("public/photos/still-life")
# Contact-sheet thumbs (small); lightbox still uses PUBLISH_STILL_LIFE_REL.
PUBLISH_SHEET_REL = Path("public/photos/sheet")
# Human-in-the-loop: optimized bytes land here until `gallery:promote` (gitignored via `.tmp/`).
HITL_STAGING_STILL_LIFE_REL = Path(".tmp/gallery-hitl/photos/still-life")
HITL_PENDING_REL = Path(".tmp/gallery-hitl/pending.json")
ALLOWED_BUCKETS = frozenset({"bw", "color", "redscale", "people", "still-life", "about"})
ALLOWED_LINK_MODES = frozenset({"copy", "symlink"})


def _fallback_repo_root_from_filetree() -> Path | None:
    marker = Path(__file__).resolve()
    cur = marker.parent
    while cur != cur.parent:
        if (cur / "package.json").is_file():
            return cur
        cur = cur.parent
    return None


def _load_dotenv_for_gallery() -> None:
    """Load `.env` then `.env.local` from repo root(s); does not override existing OS env vars.

    Loads the workspace root next to ``tools/gallery`` first so ``GALLERY_REPO_ROOT`` can be set
    there, then loads the forced root (when present).
    """
    try:
        from dotenv import load_dotenv
    except ImportError:
        return

    loaded: set[str] = set()

    def visit(root: Path) -> None:
        rp = root.expanduser().resolve()
        key = str(rp)
        if key in loaded:
            return
        loaded.add(key)
        load_dotenv(rp / ".env")
        load_dotenv(rp / ".env.local")

    near = _fallback_repo_root_from_filetree()
    if near is not None:
        visit(near)

    forced = os.environ.get("GALLERY_REPO_ROOT", "").strip()
    if forced:
        visit(Path(forced))


_load_dotenv_for_gallery()


def repo_root() -> Path:
    forced = os.environ.get("GALLERY_REPO_ROOT", "").strip()
    if forced:
        return Path(forced).expanduser().resolve()
    got = _fallback_repo_root_from_filetree()
    if got is None:
        raise RuntimeError("gallery: could not locate repo root (no package.json in parents)")
    return got.resolve()
