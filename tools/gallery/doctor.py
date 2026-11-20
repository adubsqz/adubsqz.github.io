from __future__ import annotations

from pathlib import Path
from shutil import which

from gallery.config import HITL_PENDING_REL, MANIFEST_REL, PUBLISH_STILL_LIFE_REL, repo_root
from gallery.hitl_pending import load_pending_entries
from gallery.photo_prompt import resolved_photo_prompt_bin


def main(argv: list[str] | None = None) -> int:
    _ = argv
    repo = repo_root()
    print("repo:", repo)
    print("manifest:", repo / MANIFEST_REL)
    print("publish root:", repo / PUBLISH_STILL_LIFE_REL)
    b = resolved_photo_prompt_bin()
    p = Path(b)
    if p.is_file():
        status = "file path exists"
    elif which(b):
        status = "on PATH"
    else:
        status = "not found (set GALLERY_PHOTO_PROMPT or install photo-prompt)"
    print("photo-prompt binary:", b, f"({status})")
    pend = load_pending_entries(repo)
    print("HITL pending:", len(pend), "row(s)", f"({repo / HITL_PENDING_REL})" if pend else "")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
