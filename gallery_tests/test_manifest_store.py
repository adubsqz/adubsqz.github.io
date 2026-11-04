import json

from pathlib import Path

from gallery.manifest_store import append_if_absent, load_manifest, save_manifest


def _minimal_manifest():
    return {"about": [], "bw": [], "color": [], "redscale": [], "people": []}


def test_manifest_key_order_stable(tmp_path, monkeypatch):
    repo = tmp_path / "r"
    (repo / "src").mkdir(parents=True)
    m = repo / "src" / "gallery-manifest.json"
    monkeypatch.setenv("GALLERY_REPO_ROOT", str(repo))
    m.write_text(json.dumps(_minimal_manifest()), encoding="utf-8")
    save_manifest(repo, load_manifest(repo))
    text = m.read_text(encoding="utf-8")
    i_about = text.index('"about"')
    i_bw = text.index('"bw"')
    i_co = text.index('"color"')
    i_rs = text.index('"redscale"')
    i_people = text.index('"people"')
    assert i_about < i_bw < i_co < i_rs < i_people


def test_append_duplicate_returns_false(tmp_path, monkeypatch):
    repo = tmp_path / "r"
    (repo / "src").mkdir(parents=True)
    monkeypatch.setenv("GALLERY_REPO_ROOT", str(repo))
    save_manifest(repo, {**_minimal_manifest(), "bw": ["bw/foo.jpg"]})
    assert append_if_absent(repo, "bw", "bw/foo.jpg") is False


def test_append_import_bucket_still_life_targets_about_list(tmp_path, monkeypatch):
    repo = tmp_path / "r"
    (repo / "src").mkdir(parents=True)
    monkeypatch.setenv("GALLERY_REPO_ROOT", str(repo))
    save_manifest(repo, _minimal_manifest())
    assert append_if_absent(repo, "still-life", "portrait.jpg") is True
    buckets = load_manifest(repo)
    assert "portrait.jpg" in buckets["about"]
    assert append_if_absent(repo, "about", "portrait.jpg") is False


def test_append_new_returns_true(tmp_path, monkeypatch):
    repo = tmp_path / "r"
    (repo / "src").mkdir(parents=True)
    monkeypatch.setenv("GALLERY_REPO_ROOT", str(repo))
    save_manifest(repo, _minimal_manifest())
    assert append_if_absent(repo, "color", "color/z.png") is True
    buckets = load_manifest(repo)
    assert "color/z.png" in buckets["color"]


def test_append_preserves_curation_objects(tmp_path, monkeypatch):
    repo = tmp_path / "r"
    (repo / "src").mkdir(parents=True)
    monkeypatch.setenv("GALLERY_REPO_ROOT", str(repo))
    row = {"path": "bw/a.jpg", "palette": "neutral", "vibe": ["moody"], "versatility": ["corporate"]}
    save_manifest(repo, {**_minimal_manifest(), "bw": [row]})
    assert append_if_absent(repo, "bw", "bw/b.jpg") is True
    buckets = load_manifest(repo)
    assert buckets["bw"][0] == row
    assert buckets["bw"][-1] == "bw/b.jpg"


def test_append_duplicate_object_token_returns_false(tmp_path, monkeypatch):
    repo = tmp_path / "r"
    (repo / "src").mkdir(parents=True)
    monkeypatch.setenv("GALLERY_REPO_ROOT", str(repo))
    row = {"path": "color/x.jpg", "palette": "warm", "vibe": ["bright"], "versatility": ["residential"]}
    save_manifest(repo, {**_minimal_manifest(), "color": [row]})
    assert append_if_absent(repo, "color", "color/x.jpg") is False
