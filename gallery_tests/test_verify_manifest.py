import json

from pathlib import Path

from gallery.manifest_store import save_manifest
from gallery.verify_manifest import verify_manifest


def _repo(tmp_path):
    r = tmp_path / "gallery_repo"
    (r / "src").mkdir(parents=True)
    (r / "public" / "photos" / "still-life").mkdir(parents=True)
    return r


def test_verify_reports_missing_assets(tmp_path, monkeypatch):
    repo = _repo(tmp_path)
    monkeypatch.chdir(repo)
    monkeypatch.setenv("GALLERY_REPO_ROOT", str(repo))
    manifest = repo / "src" / "gallery-manifest.json"
    manifest.write_text(
        json.dumps({"about": [], "bw": ["pixel.png"], "color": []}),
        encoding="utf-8",
    )
    errs = verify_manifest(repo)
    assert len(errs) >= 1
    assert any("missing file" in e for e in errs)


def test_verify_detects_orphan(tmp_path, monkeypatch):
    repo = _repo(tmp_path)
    save_manifest(repo, {"about": [], "bw": [], "color": []})
    orphan = repo / "public/photos/still-life/bw/ghost.png"
    orphan.parent.mkdir(parents=True, exist_ok=True)
    orphan.write_bytes(b"x")
    errs = verify_manifest(repo)
    assert any("orphan" in e for e in errs)


def test_verify_detects_people_orphan(tmp_path, monkeypatch):
    repo = _repo(tmp_path)
    save_manifest(repo, {"about": [], "bw": [], "color": [], "redscale": [], "people": []})
    orphan = repo / "public/photos/still-life/people/ghost.png"
    orphan.parent.mkdir(parents=True, exist_ok=True)
    orphan.write_bytes(b"x")
    errs = verify_manifest(repo)
    assert any("orphan" in e and "people/ghost.png" in e for e in errs)


def test_verify_detects_root_orphan(tmp_path, monkeypatch):
    repo = _repo(tmp_path)
    monkeypatch.chdir(repo)
    monkeypatch.setenv("GALLERY_REPO_ROOT", str(repo))
    save_manifest(repo, {"about": [], "bw": [], "color": []})
    loose = repo / "public/photos/still-life/loose.jpg"
    loose.write_bytes(b"x")
    errs = verify_manifest(repo)
    assert any("orphan" in e and "loose.jpg" in e for e in errs)
