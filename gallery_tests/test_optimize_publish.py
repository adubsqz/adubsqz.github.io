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


def _make_fake_logo(path: Path, *, fill: tuple[int, int, int, int]) -> None:
    """Tiny RGBA wordmark stand-in (opaque glyph on transparent ground)."""
    im = Image.new("RGBA", (200, 50), (0, 0, 0, 0))
    for x in range(20, 180):
        for y in range(10, 40):
            im.putpixel((x, y), fill)
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path)


def test_polaroid_logo_black_ink_darkens_light_margin(monkeypatch, tmp_path: Path):
    monkeypatch.delenv("GALLERY_SKIP_WATERMARK", raising=False)
    monkeypatch.delenv("GALLERY_LOGO_INK", raising=False)
    monkeypatch.delenv("GALLERY_MAX_WIDTH", raising=False)
    monkeypatch.delenv("GALLERY_MAX_HEIGHT", raising=False)

    repo = tmp_path / "repo"
    logo = repo / "public" / "adubsqz_logo_black.png"
    _make_fake_logo(logo, fill=(0, 0, 0, 255))

    # Classic Polaroid-ish: light frame with darker emulsion square on top.
    src = tmp_path / "polaroid.jpg"
    frame = Image.new("RGB", (500, 600), color=(235, 228, 210))
    emulsion = Image.new("RGB", (420, 420), color=(40, 60, 80))
    frame.paste(emulsion, (40, 40))
    frame.save(src, quality=95)

    from gallery.optimize_publish import compute_polaroid_logo_box, polaroid_logo_screen_rect

    # Placement is decided on the source (burned output confuses emulsion detection).
    with Image.open(src) as src_img:
        planned = compute_polaroid_logo_box(src_img, logo_aspect=50 / 200)
    assert (planned[2] - planned[0]) / 500 >= 0.70

    dst = tmp_path / "out.jpg"
    burn_resize_watermark(src, dst, logo_ink="black", repo_root=repo)

    with Image.open(dst) as img:
        assert img.size == (500, 600)
        l, t, r, b = polaroid_logo_screen_rect(500, 600)
        crop = img.crop((l, t, r, b))
        pixels = list(crop.getdata())
        mean = sum(0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2] for p in pixels) / len(pixels)
        # Center of bottom margin should be darker than the peach frame (~230).
        assert mean < 210


def test_polaroid_logo_silver_ink_lightens_dark_margin(monkeypatch, tmp_path: Path):
    monkeypatch.delenv("GALLERY_SKIP_WATERMARK", raising=False)
    monkeypatch.delenv("GALLERY_LOGO_INK", raising=False)
    monkeypatch.delenv("GALLERY_MAX_WIDTH", raising=False)
    monkeypatch.delenv("GALLERY_MAX_HEIGHT", raising=False)

    repo = tmp_path / "repo"
    logo = repo / "public" / "adubsqz_logo_white.png"
    _make_fake_logo(logo, fill=(255, 255, 255, 255))

    src = tmp_path / "dark-frame.jpg"
    frame = Image.new("RGB", (500, 600), color=(18, 18, 20))
    emulsion = Image.new("RGB", (420, 420), color=(90, 70, 50))
    frame.paste(emulsion, (40, 40))
    frame.save(src, quality=95)

    from gallery.optimize_publish import compute_polaroid_logo_box, polaroid_logo_screen_rect

    with Image.open(src) as src_img:
        planned = compute_polaroid_logo_box(src_img, logo_aspect=50 / 200)
    assert (planned[2] - planned[0]) / 500 >= 0.70

    dst = tmp_path / "out.jpg"
    burn_resize_watermark(src, dst, logo_ink="silver", repo_root=repo)

    with Image.open(dst) as img:
        l, t, r, b = polaroid_logo_screen_rect(500, 600)
        crop = img.crop((l, t, r, b))
        pixels = list(crop.getdata())
        mean = sum(0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2] for p in pixels) / len(pixels)
        assert mean > 40


def test_rejects_bad_logo_ink_on_burn(monkeypatch, tmp_path: Path):
    monkeypatch.delenv("GALLERY_LOGO_INK", raising=False)
    src = tmp_path / "in.jpg"
    Image.new("RGB", (200, 200), color=(80, 80, 80)).save(src, quality=90)
    with pytest.raises(ValueError, match="logo_ink"):
        burn_resize_watermark(src, tmp_path / "out.jpg", logo_ink="gold")


def test_publish_options_rejects_bad_gallery_logo_ink_env(monkeypatch):
    monkeypatch.setenv("GALLERY_LOGO_INK", "gold")
    with pytest.raises(ValueError, match="logo_ink"):
        _publish_options()


def test_env_gallery_logo_ink_enables_polaroid_mode(monkeypatch, tmp_path: Path):
    monkeypatch.delenv("GALLERY_SKIP_WATERMARK", raising=False)
    monkeypatch.setenv("GALLERY_LOGO_INK", "black")
    monkeypatch.delenv("GALLERY_MAX_WIDTH", raising=False)
    monkeypatch.delenv("GALLERY_MAX_HEIGHT", raising=False)

    repo = tmp_path / "repo"
    _make_fake_logo(repo / "public" / "adubsqz_logo_black.png", fill=(0, 0, 0, 255))

    src = tmp_path / "polaroid.jpg"
    frame = Image.new("RGB", (500, 600), color=(235, 228, 210))
    frame.paste(Image.new("RGB", (420, 420), color=(40, 60, 80)), (40, 40))
    frame.save(src, quality=95)

    dst = tmp_path / "out.jpg"
    burn_resize_watermark(src, dst, repo_root=repo)

    from gallery.optimize_publish import polaroid_logo_screen_rect

    with Image.open(dst) as img:
        l, t, r, b = polaroid_logo_screen_rect(500, 600)
        crop = img.crop((l, t, r, b))
        pixels = list(crop.getdata())
        mean = sum(0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2] for p in pixels) / len(pixels)
        assert mean < 210


def test_polaroid_mode_skips_corner_copyright_plate(monkeypatch, tmp_path: Path):
    """logo_ink burns margin logo only — corner © dark pad must not appear."""
    from gallery.optimize_publish import compute_polaroid_logo_box, polaroid_logo_screen_rect, watermark_label_screen_rect

    monkeypatch.delenv("GALLERY_SKIP_WATERMARK", raising=False)
    monkeypatch.delenv("GALLERY_LOGO_INK", raising=False)
    monkeypatch.delenv("GALLERY_MAX_WIDTH", raising=False)
    monkeypatch.delenv("GALLERY_MAX_HEIGHT", raising=False)

    repo = tmp_path / "repo"
    _make_fake_logo(repo / "public" / "adubsqz_logo_black.png", fill=(0, 0, 0, 255))

    # Flat mid-gray so corner © plate would be the only dark feature.
    src = tmp_path / "flat.jpg"
    Image.new("RGB", (500, 600), color=(160, 160, 160)).save(src, quality=95)

    copyright_dst = tmp_path / "copyright.jpg"
    logo_dst = tmp_path / "logo.jpg"
    burn_resize_watermark(src, copyright_dst)
    burn_resize_watermark(src, logo_dst, logo_ink="black", repo_root=repo)

    opts = _publish_options()
    l, t, r, b = watermark_label_screen_rect(
        500,
        600,
        watermark_text=opts["watermark_text"],
        watermark_position=opts["watermark_position"],
    )

    def _corner_mean(path: Path) -> float:
        with Image.open(path) as img:
            crop = img.crop((l, t, r, b))
            pixels = list(crop.getdata())
            return sum(0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2] for p in pixels) / len(pixels)

    # © mode darkens the corner plate. Polaroid mode uses a huge centered margin logo —
    # plan placement on the flat source, then sample the right gutter outside that box.
    assert _corner_mean(copyright_dst) < 80
    with Image.open(src) as src_img:
        box = compute_polaroid_logo_box(src_img, logo_aspect=50 / 200)
    assert (box[2] - box[0]) / 500 >= 0.70
    with Image.open(logo_dst) as img:
        gutter = img.crop((min(img.width - 8, box[2] + 1), box[1], img.width, box[3]))
        pixels = list(gutter.getdata())
        gutter_mean = sum(0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2] for p in pixels) / max(
            1, len(pixels)
        )
        assert gutter_mean > 140
        # Fixed verify band should also show the burn-in.
        l, t, r, b = polaroid_logo_screen_rect(500, 600)
        band = img.crop((l, t, r, b))
        band_pixels = list(band.getdata())
        band_mean = sum(
            0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2] for p in band_pixels
        ) / len(band_pixels)
        assert band_mean < 120


def test_missing_logo_asset_raises(monkeypatch, tmp_path: Path):
    monkeypatch.delenv("GALLERY_SKIP_WATERMARK", raising=False)
    monkeypatch.delenv("GALLERY_LOGO_INK", raising=False)
    # Env override wins and must not fall back to the real repo public/ logos.
    monkeypatch.setenv("GALLERY_LOGO_BLACK", str(tmp_path / "missing-logo.png"))
    src = tmp_path / "in.jpg"
    Image.new("RGB", (200, 240), color=(200, 200, 200)).save(src, quality=90)
    with pytest.raises(FileNotFoundError, match="GALLERY_LOGO_BLACK"):
        burn_resize_watermark(src, tmp_path / "out.jpg", logo_ink="black", repo_root=tmp_path / "repo")


def test_skip_watermark_still_skips_polaroid_logo(monkeypatch, tmp_path: Path):
    monkeypatch.setenv("GALLERY_SKIP_WATERMARK", "1")
    monkeypatch.delenv("GALLERY_LOGO_INK", raising=False)
    monkeypatch.delenv("GALLERY_MAX_WIDTH", raising=False)
    monkeypatch.delenv("GALLERY_MAX_HEIGHT", raising=False)

    repo = tmp_path / "repo"
    _make_fake_logo(repo / "public" / "adubsqz_logo_black.png", fill=(0, 0, 0, 255))

    src = tmp_path / "polaroid.jpg"
    frame = Image.new("RGB", (500, 600), color=(235, 228, 210))
    frame.paste(Image.new("RGB", (420, 420), color=(40, 60, 80)), (40, 40))
    frame.save(src, quality=95)

    dst = tmp_path / "out.jpg"
    burn_resize_watermark(src, dst, logo_ink="black", repo_root=repo)

    from gallery.optimize_publish import polaroid_logo_screen_rect

    with Image.open(dst) as img:
        l, t, r, b = polaroid_logo_screen_rect(500, 600)
        crop = img.crop((l, t, r, b))
        pixels = list(crop.getdata())
        mean = sum(0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2] for p in pixels) / len(pixels)
        # Peach frame untouched — no logo burn-in when skip is set.
        assert mean > 220

