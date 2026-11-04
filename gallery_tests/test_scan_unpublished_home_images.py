from pathlib import Path

from gallery.scan_unpublished_home_images import dedupe_by_basename, manifest_basenames


def test_manifest_basenames_strips_directories(tmp_path: Path) -> None:
    m = tmp_path / "gallery-manifest.json"
    m.write_text(
        '{"about": ["x.jpg"], "bw": ["bw/a.JPG"], "color": ["color/sub/z.png"]}',
        encoding="utf-8",
    )
    names = manifest_basenames(m)
    assert names == {"x.jpg", "a.jpg", "z.png"}


def test_dedupe_prefers_originals(tmp_path: Path) -> None:
    originals = tmp_path / "originals"
    dl = tmp_path / "Downloads"
    originals.mkdir()
    dl.mkdir()
    a = originals / "X.JPG"
    b = dl / "x.jpg"
    a.write_bytes(b"0" * 100)
    b.write_bytes(b"0" * 9999)
    out = dedupe_by_basename([(b, 9999), (a, 100)])
    assert len(out) == 1 and out[0][0] == a
