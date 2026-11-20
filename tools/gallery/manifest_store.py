from __future__ import annotations

import json
from collections import OrderedDict
from pathlib import Path
from typing import Any

from gallery.config import MANIFEST_REL
from gallery.manifest_entry import entry_token

# Keep in sync with src/gallery-manifest.json top-level keys (and gallery_tests).
_KEYS = ("about", "shooks_run", "bw", "color", "redscale", "people")


def _storage_manifest_key(import_bucket: str) -> str:
    b = import_bucket.lower().strip()
    if b in ("still-life", "about"):
        return "about"
    if b in ("bw", "color", "redscale", "people", "shooks_run"):
        return b
    raise ValueError(f"unsupported manifest import bucket {import_bucket!r}")


def load_manifest(repo: Path) -> dict[str, list[Any]]:
    path = repo / MANIFEST_REL
    raw = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(raw, dict):
        raise ValueError("gallery-manifest.json must contain a JSON object")
    out: dict[str, list[Any]] = {}
    for k in _KEYS:
        v = raw.get(k, [])
        if not isinstance(v, list):
            raise ValueError(f"gallery-manifest {k} must be a JSON array")
        out[k] = list(v)
    legacy = raw.get("still-life", [])
    if isinstance(legacy, list) and legacy:
        seen = {entry_token(i, "about") for i in out["about"]}
        for item in legacy:
            try:
                tok = entry_token(item, "about")
            except ValueError:
                continue
            if tok not in seen:
                out["about"].append(item)
                seen.add(tok)
    return out


def save_manifest(repo: Path, buckets: dict[str, list[Any]]) -> None:
    path = repo / MANIFEST_REL
    ordered = OrderedDict()
    for k in _KEYS:
        ordered[k] = list(buckets.get(k, []))
    txt = json.dumps(ordered, indent=2)
    path.write_text(txt + "\n", encoding="utf-8")


def append_if_absent(repo: Path, import_bucket: str, token: str) -> bool:
    key = _storage_manifest_key(import_bucket)
    buckets = load_manifest(repo)
    existing = {entry_token(item, key) for item in buckets[key]}
    if token in existing:
        return False
    buckets[key] = [*buckets[key], token]
    save_manifest(repo, buckets)
    return True
