import json
from pathlib import Path

from PIL import Image

from gallery.optimize_publish import burn_resize_watermark
from gallery.verify_manifest import verify_publish_assets
from gallery_tests.fixtures import write_sharp_noise_png


def _repo(tmp_path: Path) -> Path:
    r = tmp_path / "gallery_repo"
    (r / "src").mkdir(parents=True)
    (r / "public" / "photos" / "still-life" / "bw").mkdir(parents=True)
    return r


def test_publish_assets_reject_oversized(tmp_path: Path, monkeypatch) -> None:
    repo = _repo(tmp_path)
    monkeypatch.chdir(repo)
    monkeypatch.setenv("GALLERY_REPO_ROOT", str(repo))
    (repo / "src" / "gallery-manifest.json").write_text(
        json.dumps({"about": [], "bw": ["big.jpg"], "color": []}),
        encoding="utf-8",
    )
    p = repo / "public/photos/still-life/bw/big.jpg"
    Image.new("RGB", (3000, 400), color=(40, 40, 40)).save(p, quality=90)
    monkeypatch.delenv("GALLERY_MAX_WIDTH", raising=False)
    monkeypatch.delenv("GALLERY_MAX_HEIGHT", raising=False)
    errs = verify_publish_assets(repo)
    assert any("dimensions exceed" in e for e in errs)


def test_publish_assets_reject_flat_no_watermark(tmp_path: Path, monkeypatch) -> None:
    repo = _repo(tmp_path)
    monkeypatch.chdir(repo)
    monkeypatch.setenv("GALLERY_REPO_ROOT", str(repo))
    (repo / "src" / "gallery-manifest.json").write_text(
        json.dumps({"about": [], "bw": ["flat.jpg"], "color": []}),
        encoding="utf-8",
    )
    p = repo / "public/photos/still-life/bw/flat.jpg"
    Image.new("RGB", (800, 600), color=(120, 120, 120)).save(p, quality=92)
    errs = verify_publish_assets(repo)
    assert any("watermark" in e.lower() for e in errs)


def test_publish_assets_pass_after_burn_resize_watermark(tmp_path: Path, monkeypatch) -> None:
    repo = _repo(tmp_path)
    monkeypatch.chdir(repo)
    monkeypatch.setenv("GALLERY_REPO_ROOT", str(repo))
    (repo / "src" / "gallery-manifest.json").write_text(
        json.dumps({"about": [], "bw": ["out.jpg"], "color": []}),
        encoding="utf-8",
    )
    src = repo / "source.png"
    write_sharp_noise_png(src)
    dst = repo / "public/photos/still-life/bw/out.jpg"
    monkeypatch.delenv("GALLERY_SKIP_WATERMARK", raising=False)
    burn_resize_watermark(src, dst)
    errs = verify_publish_assets(repo)
    assert errs == []
