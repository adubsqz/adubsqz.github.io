"""Normalize gallery-manifest rows (plain path strings or curation objects)."""

from __future__ import annotations

from typing import Any


def entry_token(raw: Any, bucket: str) -> str:
    """Return manifest token e.g. ``bw/foo.jpg``."""
    if isinstance(raw, dict):
        path = raw.get("path") or raw.get("token")
        if not isinstance(path, str) or not path.strip():
            raise ValueError(f"manifest object in {bucket!r} missing string 'path'")
        tok = path.strip().lstrip("/").replace("\\", "/")
    else:
        tok = str(raw).strip().lstrip("/").replace("\\", "/")
    if not tok:
        raise ValueError(f"empty manifest entry in {bucket!r}")
    if bucket == "about":
        return tok
    if "/" not in tok:
        return f"{bucket}/{tok}"
    return tok
