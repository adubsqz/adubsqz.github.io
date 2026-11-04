from pathlib import Path

import pytest
from PIL import Image

from gallery.optimize_publish import _publish_options, burn_resize_watermark


def test_burn_respects_max_dimensions(monkeypatch, tmp_path: Path):
    monkeypatch.delenv("GALLERY_MAX_WIDTH", raising=False)
    monkeypatch.delenv("GALLERY_MAX_HEIGHT", raising=False)

    src = tmp_path / "wide.png"
    Image.new("RGB", (3200, 800), color=(200, 0, 50)).save(src)

    dst = tmp_path / "out.jpg"
    burn_resize_watermark(src, dst)

    with Image.open(dst) as img:
        assert img.size == (2400, 600)


def test_burn_skips_resize_when_already_small(monkeypatch, tmp_path: Path):
    monkeypatch.delenv("GALLERY_MAX_WIDTH", raising=False)
    monkeypatch.delenv("GALLERY_MAX_HEIGHT", raising=False)

    src = tmp_path / "small.png"
    Image.new("RGB", (120, 80), color=(10, 20, 30)).save(src)

    dst = tmp_path / "tiny.jpg"
    burn_resize_watermark(src, dst)

    with Image.open(dst) as img:
        assert img.size == (120, 80)


def test_write_sheet_thumb_downscales_and_forces_jpeg(monkeypatch, tmp_path: Path):
    from gallery.optimize_publish import write_sheet_thumb

    monkeypatch.setenv("GALLERY_SHEET_MAX_EDGE", "200")
    src = tmp_path / "big.jpg"
    Image.new("RGB", (1200, 800), color=(40, 80, 120)).save(src, quality=95)
    dest = tmp_path / "out.png"
    write_sheet_thumb(src, dest)
    out = dest.with_suffix(".jpg")
    assert out.is_file()
    with Image.open(out) as img:
        assert img.format == "JPEG"
        assert max(img.size) <= 200


def test_publish_options_rejects_non_integer_env(monkeypatch):
    monkeypatch.setenv("GALLERY_MAX_WIDTH", "not-a-number")
    with pytest.raises(ValueError, match="GALLERY_MAX_WIDTH"):
        _publish_options()


def test_skip_watermark_passes_through_without_overlay(monkeypatch, tmp_path: Path):
    monkeypatch.setenv("GALLERY_SKIP_WATERMARK", "1")
    monkeypatch.delenv("GALLERY_MAX_WIDTH", raising=False)
    monkeypatch.delenv("GALLERY_MAX_HEIGHT", raising=False)

    src = tmp_path / "in.jpg"
    Image.new("RGB", (400, 300), color=(10, 90, 200)).save(src, quality=95)

    dst = tmp_path / "out.jpg"
    burn_resize_watermark(src, dst)

    with Image.open(dst) as img:
        assert img.size == (400, 300)
        assert img.mode == "RGB"

