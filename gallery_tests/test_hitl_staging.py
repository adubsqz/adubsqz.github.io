import json

from gallery.hitl_pending import load_pending_entries
from gallery.manifest_store import load_manifest
from gallery.run_import import main
from gallery.run_promote import main as promote_main
from gallery_tests.fixtures import write_sharp_noise_png


def test_stage_only_writes_hitl_not_public_or_manifest(tmp_path, monkeypatch):
    repo = tmp_path / "r"
    (repo / "src").mkdir(parents=True)
    monkeypatch.chdir(repo)
    monkeypatch.setenv("GALLERY_REPO_ROOT", str(repo))
    (repo / "src" / "gallery-manifest.json").write_text(
        json.dumps({"about": [], "bw": [], "color": []}),
        encoding="utf-8",
    )
    pix = repo / "in.png"
    write_sharp_noise_png(pix)
    mfile = repo / "map.json"
    mfile.write_text(
        json.dumps(
            {
                "entries": [
                    {"source": str(pix), "bucket": "color", "link_mode": "copy", "dest_basename": "hitl-test.jpg"},
                ]
            }
        ),
        encoding="utf-8",
    )
    assert main(["--map", str(mfile), "--stage-only"]) == 0

    staged = repo / ".tmp/gallery-hitl/photos/still-life/color/hitl-test.jpg"
    assert staged.is_file()
    assert not (repo / "public").exists()

    buckets = load_manifest(repo)
    assert buckets["color"] == []

    pend = load_pending_entries(repo)
    assert len(pend) == 1
    assert pend[0].token == "color/hitl-test.jpg"


def test_promote_moves_to_public_and_manifest(tmp_path, monkeypatch):
    repo = tmp_path / "r"
    (repo / "src").mkdir(parents=True)
    monkeypatch.chdir(repo)
    monkeypatch.setenv("GALLERY_REPO_ROOT", str(repo))
    (repo / "src" / "gallery-manifest.json").write_text(
        json.dumps({"about": [], "bw": [], "color": []}),
        encoding="utf-8",
    )
    pix = repo / "in.png"
    write_sharp_noise_png(pix)
    mfile = repo / "map.json"
    mfile.write_text(
        json.dumps(
            {
                "entries": [
                    {"source": str(pix), "bucket": "color", "link_mode": "copy", "dest_basename": "promo.jpg"},
                ]
            }
        ),
        encoding="utf-8",
    )
    assert main(["--map", str(mfile), "--stage-only"]) == 0

    assert promote_main(["--approve-all"]) == 0

    pub = repo / "public/photos/still-life/color/promo.jpg"
    assert pub.is_file()
    buckets = load_manifest(repo)
    assert "color/promo.jpg" in buckets["color"]
    assert load_pending_entries(repo) == []


def test_drop_tokens_removes_queue_rows(tmp_path, monkeypatch):
    repo = tmp_path / "r"
    (repo / "src").mkdir(parents=True)
    monkeypatch.chdir(repo)
    monkeypatch.setenv("GALLERY_REPO_ROOT", str(repo))
    (repo / "src" / "gallery-manifest.json").write_text(
        json.dumps({"about": [], "bw": [], "color": []}),
        encoding="utf-8",
    )
    a = repo / "a.png"
    b = repo / "b.png"
    write_sharp_noise_png(a)
    write_sharp_noise_png(b)
    mfile = repo / "map.json"
    mfile.write_text(
        json.dumps(
            {
                "entries": [
                    {"source": str(a), "bucket": "color", "link_mode": "copy", "dest_basename": "keep.jpg"},
                    {"source": str(b), "bucket": "color", "link_mode": "copy", "dest_basename": "drop.jpg"},
                ]
            }
        ),
        encoding="utf-8",
    )
    assert main(["--map", str(mfile), "--stage-only"]) == 0
    assert promote_main(["--drop-tokens", "color/drop.jpg"]) == 0
    pend = load_pending_entries(repo)
    assert len(pend) == 1
    assert pend[0].token == "color/keep.jpg"
