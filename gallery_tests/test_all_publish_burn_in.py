"""Every manifest-listed publish must carry JPEG © burn-in (durable half of double watermark).

Catches future imports that skip optimize_publish / burn_resize_watermark before they ship.
"""

from __future__ import annotations

from pathlib import Path

from gallery.config import PUBLISH_STILL_LIFE_REL, repo_root
from gallery.manifest_entry import entry_token
from gallery.manifest_store import load_manifest
from gallery.optimize_publish import _publish_options
from gallery.verify_manifest import _check_watermark_heuristic, verify_publish_assets


def _all_manifest_tokens(repo: Path) -> list[str]:
    data = load_manifest(repo)
    tokens: list[str] = []
    for bucket, items in data.items():
        for raw in items:
            tokens.append(entry_token(raw, bucket))
    return sorted(set(tokens))


def test_every_manifest_publish_has_burn_in_watermark() -> None:
    repo = repo_root()
    pub = repo / PUBLISH_STILL_LIFE_REL
    opts = _publish_options()
    missing: list[str] = []
    tokens = _all_manifest_tokens(repo)
    assert tokens, "gallery-manifest.json has no publish tokens"
    for rel in tokens:
        path = pub / rel
        assert path.is_file(), f"missing publish for manifest entry {rel}"
        err = _check_watermark_heuristic(path, opts)
        if err:
            missing.append(err)
    assert missing == [], "\n".join(missing)


def test_verify_publish_assets_covers_full_manifest() -> None:
    """gallery:verify watermark path must stay wired for every bucket including shooks_run/people."""
    repo = repo_root()
    errs = verify_publish_assets(repo)
    assert errs == [], "\n".join(errs)
