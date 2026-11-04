"""Tests for ``gallery.draft_probe_map``."""

import json
from pathlib import Path

from gallery.draft_probe_map import main


def test_draft_probe_excludes_manifest_basenames(tmp_path, monkeypatch):
    repo = tmp_path / "repo"
    (repo / "src").mkdir(parents=True)
    (repo / "src" / "gallery-manifest.json").write_text(
        json.dumps(
            {
                "about": [],
                "bw": ["bw/keepme.jpg"],
                "color": [],
            }
        ),
        encoding="utf-8",
    )
    monkeypatch.setenv("GALLERY_REPO_ROOT", str(repo))

    orig = tmp_path / "originals"
    orig.mkdir()
    (orig / "keepme.jpg").write_bytes(b"x")
    (orig / "fresh-a.jpg").write_bytes(b"a")
    (orig / "fresh-b.jpg").write_bytes(b"b")

    out = tmp_path / "map.json"
    assert main(["--originals", str(orig), "--count", "2", "--seed", "1", "-o", str(out)]) == 0
    data = json.loads(out.read_text(encoding="utf-8"))
    paths = [Path(e["source"]) for e in data["entries"]]
    assert all(p.name != "keepme.jpg" for p in paths)
    assert len(data["entries"]) == 2
    for e in data["entries"]:
        assert e["dest_basename"].startswith("probe-")


def test_draft_probe_fails_when_not_enough_candidates(tmp_path, monkeypatch):
    repo = tmp_path / "repo"
    (repo / "src").mkdir(parents=True)
    (repo / "src" / "gallery-manifest.json").write_text(
        json.dumps({"about": [], "bw": [], "color": []}),
        encoding="utf-8",
    )
    monkeypatch.setenv("GALLERY_REPO_ROOT", str(repo))
    orig = tmp_path / "originals"
    orig.mkdir()
    (orig / "only.jpg").write_bytes(b"x")
    out = tmp_path / "map.json"
    assert main(["--originals", str(orig), "--count", "5", "-o", str(out)]) == 1
