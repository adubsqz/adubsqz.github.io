"""Resize + burn-in text watermark before publishing (aligned with scripts/optimize_images.py defaults)."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Tuple

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError as e:  # pragma: no cover
    raise ImportError(
        "gallery-import requires Pillow for resize/watermark. "
        'Install deps: pip install -r requirements-gallery.txt (or rerun any "npm run gallery:*").'
    ) from e


def _int_env(key: str, default: int) -> int:
    raw = os.environ.get(key, "").strip()
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError as e:
        raise ValueError(f"environment variable {key!r} must be an integer, got {raw!r}") from e


def _truthy_env(key: str) -> bool:
    return os.environ.get(key, "").strip().lower() in ("1", "true", "yes")


def _publish_options() -> dict:
    wm_pos = os.environ.get("GALLERY_WATERMARK_POSITION", "bottom-right").strip() or "bottom-right"
    return {
        # Defaults tuned for ~400–500KB typical color JPEGs at 2400px long edge when sources are full-res scans.
        "max_width": _int_env("GALLERY_MAX_WIDTH", 2400),
        "max_height": _int_env("GALLERY_MAX_HEIGHT", 2400),
        "jpeg_quality": max(1, min(100, _int_env("GALLERY_JPEG_QUALITY", 92))),
        "png_compression": max(0, min(9, _int_env("GALLERY_PNG_COMPRESSION", 6))),
        "watermark_text": os.environ.get("GALLERY_WATERMARK_TEXT", "© adubsqz"),
        # 0–255 alpha for burn-in text; default ~84% — stronger than legacy 180 (~71%) for web legibility
        "watermark_opacity": max(0, min(255, _int_env("GALLERY_WATERMARK_OPACITY", 215))),
        "watermark_position": wm_pos,
        "preserve_exif": os.environ.get("GALLERY_STRIP_EXIF", "").strip().lower() not in ("1", "true", "yes"),
    }


def _lanczos():
    try:
        return Image.Resampling.LANCZOS
    except AttributeError:
        return Image.LANCZOS  # Pillow <10


def _calc_dims(w: int, h: int, max_w: int, max_h: int) -> Tuple[int, int]:
    if w <= max_w and h <= max_h:
        return w, h
    wr = max_w / w
    hr = max_h / h
    ratio = min(wr, hr)
    return int(w * ratio), int(h * ratio)


def _font_for_width(image_width: int, watermark_text: str):
    base = max(12, int(image_width * 0.02))
    for font_path in (
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "C:\\Windows\\Fonts\\arial.ttf",
    ):
        p = Path(font_path)
        if p.is_file():
            try:
                # .ttc collections need an explicit face index on some platforms
                return ImageFont.truetype(str(p), base, index=0), base
            except OSError:
                continue
    return ImageFont.load_default(), 10


def _watermark_overlay(
    img: Image.Image,
    *,
    watermark_text: str,
    watermark_opacity: int,
    watermark_position: str,
) -> Image.Image:
    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGBA")

    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    font, _ = _font_for_width(img.width, watermark_text)
    bbox = draw.textbbox((0, 0), watermark_text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    margin = int(img.width * 0.02)
    pmap = {
        "bottom-right": (img.width - tw - margin, img.height - th - margin),
        "bottom-left": (margin, img.height - th - margin),
        "top-right": (img.width - tw - margin, margin),
        "top-left": (margin, margin),
        "center": ((img.width - tw) // 2, (img.height - th) // 2),
    }
    pos = pmap.get(watermark_position, pmap["bottom-right"])
    pad = 5
    bg = [pos[0] - pad, pos[1] - pad, pos[0] + tw + pad, pos[1] + th + pad]
    # Opaque enough to read (and pass verify) on bright corners e.g. skin/high-key B&W.
    draw.rectangle(bg, fill=(0, 0, 0, int(min(255, watermark_opacity * 0.92))))
    draw.text(pos, watermark_text, font=font, fill=(255, 255, 255, watermark_opacity))

    img_rgba = img if img.mode == "RGBA" else img.convert("RGBA")
    return Image.alpha_composite(img_rgba, layer)


def watermark_label_screen_rect(
    image_width: int,
    image_height: int,
    *,
    watermark_text: str,
    watermark_position: str,
) -> tuple[int, int, int, int]:
    """Return ``(left, upper, right, lower)`` for :meth:`PIL.Image.Image.crop` / ``numpy`` slicing.

    Matches the padded rectangle around the burn-in label in :func:`_watermark_overlay`
    (same font metrics, margin, and pad). ``right``/``lower`` follow Pillow crop convention
    (right column and lower row excluded from the region).
    """
    layer = Image.new("RGB", (image_width, image_height))
    draw = ImageDraw.Draw(layer)
    font, _ = _font_for_width(image_width, watermark_text)
    bbox = draw.textbbox((0, 0), watermark_text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    margin = int(image_width * 0.02)
    pad = 5
    pmap = {
        "bottom-right": (image_width - tw - margin, image_height - th - margin),
        "bottom-left": (margin, image_height - th - margin),
        "top-right": (image_width - tw - margin, margin),
        "top-left": (margin, margin),
        "center": ((image_width - tw) // 2, (image_height - th) // 2),
    }
    pos = pmap.get(watermark_position, pmap["bottom-right"])
    l = max(0, pos[0] - pad)
    t = max(0, pos[1] - pad)
    r = min(image_width, pos[0] + tw + pad)
    b = min(image_height, pos[1] + th + pad)
    if r <= l + 2 or b <= t + 2:
        raise ValueError("watermark label region degenerate for this image size")
    return l, t, r, b


def burn_resize_watermark(src: Path, dest: Path) -> None:
    """Read image from ``src``, resize (max dims), embed watermark, write ``dest`` (suffix controls format)."""
    opts = _publish_options()
    dest.parent.mkdir(parents=True, exist_ok=True)
    suffix = dest.suffix.lower()

    with Image.open(src) as im:
        exif_bytes = None
        if opts["preserve_exif"]:
            raw = im.info.get("exif")
            if isinstance(raw, bytes):
                exif_bytes = raw

        ow, oh = im.size
        nw, nh = _calc_dims(ow, oh, opts["max_width"], opts["max_height"])
        if (nw, nh) != (ow, oh):
            im = im.resize((nw, nh), _lanczos())

        # One-shot re-encode of already-watermarked web JPEGs: avoids a second burn-in.
        if not _truthy_env("GALLERY_SKIP_WATERMARK"):
            im = _watermark_overlay(
                im,
                watermark_text=opts["watermark_text"],
                watermark_opacity=opts["watermark_opacity"],
                watermark_position=opts["watermark_position"],
            )

        if im.mode == "RGBA" and suffix in (".jpg", ".jpeg"):
            rgb = Image.new("RGB", im.size, (255, 255, 255))
            rgb.paste(im, mask=im.split()[3])
            im = rgb

        save_kw: dict = {"optimize": True}
        fmt = ""
        if suffix in (".jpg", ".jpeg"):
            save_kw["quality"] = opts["jpeg_quality"]
            fmt = "JPEG"
        elif suffix == ".png":
            save_kw["compress_level"] = opts["png_compression"]
            fmt = "PNG"
        elif suffix == ".webp":
            save_kw["quality"] = opts["jpeg_quality"]
            fmt = "WEBP"
        else:
            raise ValueError(f"unsupported output suffix for burn-in publish: {dest.suffix!r}")

        if exif_bytes and opts["preserve_exif"] and suffix in (".jpg", ".jpeg"):
            save_kw["exif"] = exif_bytes

        im.save(dest, format=fmt, **save_kw)


def write_sheet_thumb(src: Path, dest: Path) -> None:
    """Downscale an already-published web still into a contact-sheet JPEG (no second watermark)."""
    max_edge = _int_env("GALLERY_SHEET_MAX_EDGE", 640)
    quality = max(1, min(100, _int_env("GALLERY_SHEET_JPEG_QUALITY", 80)))
    dest = dest.with_suffix(".jpg")
    dest.parent.mkdir(parents=True, exist_ok=True)

    with Image.open(src) as im:
        if im.mode not in ("RGB", "L"):
            im = im.convert("RGB")
        elif im.mode == "L":
            im = im.convert("RGB")
        ow, oh = im.size
        scale = min(1.0, max_edge / max(ow, oh))
        if scale < 1.0:
            im = im.resize((max(1, int(ow * scale)), max(1, int(oh * scale))), _lanczos())
        im.save(dest, format="JPEG", quality=quality, optimize=True)
