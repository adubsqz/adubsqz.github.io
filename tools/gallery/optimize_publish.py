"""Resize + burn-in watermark before publishing (text © or Polaroid margin logo)."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Literal, Tuple

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError as e:  # pragma: no cover
    raise ImportError(
        "gallery-import requires Pillow for resize/watermark. "
        'Install deps: pip install -r requirements-gallery.txt (or rerun any "npm run gallery:*").'
    ) from e

LogoInk = Literal["black", "silver"]
_ALLOWED_LOGO_INK = frozenset({"black", "silver"})


def _int_env(key: str, default: int) -> int:
    raw = os.environ.get(key, "").strip()
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError as e:
        raise ValueError(f"environment variable {key!r} must be an integer, got {raw!r}") from e


def _float_env(key: str, default: float) -> float:
    raw = os.environ.get(key, "").strip()
    if not raw:
        return default
    try:
        return float(raw)
    except ValueError as e:
        raise ValueError(f"environment variable {key!r} must be a number, got {raw!r}") from e


def _truthy_env(key: str) -> bool:
    return os.environ.get(key, "").strip().lower() in ("1", "true", "yes")


def _normalize_logo_ink(raw: str | None) -> LogoInk | None:
    if raw is None:
        return None
    ink = str(raw).strip().lower()
    if not ink:
        return None
    if ink not in _ALLOWED_LOGO_INK:
        raise ValueError(f'logo_ink must be "black" or "silver", got {raw!r}')
    return ink  # type: ignore[return-value]


def _publish_options() -> dict:
    wm_pos = os.environ.get("GALLERY_WATERMARK_POSITION", "bottom-right").strip() or "bottom-right"
    env_ink = _normalize_logo_ink(os.environ.get("GALLERY_LOGO_INK"))
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
        # Polaroid margin logo (sharpie look). Map ``logo_ink`` overrides env.
        "logo_ink": env_ink,
        "logo_width_frac": max(0.08, min(0.55, _float_env("GALLERY_LOGO_WIDTH_FRAC", 0.30))),
        "logo_margin_frac": max(0.08, min(0.35, _float_env("GALLERY_LOGO_MARGIN_FRAC", 0.16))),
        "logo_opacity": max(0, min(255, _int_env("GALLERY_LOGO_OPACITY", 230))),
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


def polaroid_logo_screen_rect(
    image_width: int,
    image_height: int,
    *,
    logo_width_frac: float = 0.30,
    logo_margin_frac: float = 0.16,
) -> tuple[int, int, int, int]:
    """Approximate logo placement box in the bottom Polaroid margin (centered)."""
    band_h = max(8, int(image_height * logo_margin_frac))
    band_top = image_height - band_h
    target_w = max(8, int(image_width * logo_width_frac))
    # Logo aspect ~1024×254 → height ≈ 0.248 * width
    target_h = max(4, int(target_w * 0.248))
    if target_h > band_h - 4:
        target_h = max(4, band_h - 4)
        target_w = max(8, int(target_h / 0.248))
    left = max(0, (image_width - target_w) // 2)
    top = band_top + max(0, (band_h - target_h) // 2)
    right = min(image_width, left + target_w)
    bottom = min(image_height, top + target_h)
    if right <= left + 2 or bottom <= top + 2:
        raise ValueError("polaroid logo region degenerate for this image size")
    return left, top, right, bottom


def _resolve_logo_path(ink: LogoInk, repo_root: Path | None) -> Path:
    env_key = "GALLERY_LOGO_BLACK" if ink == "black" else "GALLERY_LOGO_WHITE"
    env_path = os.environ.get(env_key, "").strip()
    if env_path:
        p = Path(env_path).expanduser()
        if p.is_file():
            return p.resolve()
        raise FileNotFoundError(f"{env_key}={env_path!r} is not a file")

    # Silver uses the white mark tinted toward metallic ink.
    name = "adubsqz_logo_black.png" if ink == "black" else "adubsqz_logo_white.png"
    candidates: list[Path] = []
    if repo_root is not None:
        candidates.append(repo_root / "public" / name)
    # Fallback when burn is called without an explicit repo (tests / one-shots).
    here = Path(__file__).resolve()
    candidates.append(here.parents[2] / "public" / name)
    for c in candidates:
        if c.is_file():
            return c
    raise FileNotFoundError(f"logo asset not found for ink={ink!r}; tried {[str(c) for c in candidates]}")


def _tint_logo_rgba(logo: Image.Image, ink: LogoInk, opacity: int) -> Image.Image:
    """Apply sharpie-style ink: black mark as-is; silver = cool-grey tint of the white mark."""
    rgba = logo.convert("RGBA")
    r, g, b, a = rgba.split()
    if ink == "black":
        rgb = Image.merge("RGB", (r, g, b))
    else:
        # Metallic silver sharpie on dark borders (not pure white).
        silver = Image.new("RGB", rgba.size, (198, 202, 210))
        rgb = silver
    # Scale alpha for sharpie opacity while preserving logo silhouette.
    scale = max(0, min(255, opacity)) / 255.0
    a_scaled = a.point(lambda p: int(p * scale))
    out = Image.merge("RGBA", (*rgb.split(), a_scaled))
    return out


def _polaroid_logo_overlay(
    img: Image.Image,
    *,
    logo_ink: LogoInk,
    logo_width_frac: float,
    logo_margin_frac: float,
    logo_opacity: int,
    repo_root: Path | None = None,
) -> Image.Image:
    """Burn the adubsqz logo into the empty Polaroid margin below the emulsion."""
    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGBA")

    logo_path = _resolve_logo_path(logo_ink, repo_root)
    with Image.open(logo_path) as raw_logo:
        logo = _tint_logo_rgba(raw_logo, logo_ink, logo_opacity)

    band_h = max(8, int(img.height * logo_margin_frac))
    band_top = img.height - band_h
    target_w = max(8, int(img.width * logo_width_frac))
    aspect = logo.height / max(1, logo.width)
    target_h = max(4, int(target_w * aspect))
    if target_h > band_h - 4:
        target_h = max(4, band_h - 4)
        target_w = max(8, int(target_h / aspect))
    logo = logo.resize((target_w, target_h), _lanczos())

    # Center in the bottom margin so corner Pokémon stickers stay clear.
    x = (img.width - target_w) // 2
    y = band_top + (band_h - target_h) // 2

    base = img if img.mode == "RGBA" else img.convert("RGBA")
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    layer.paste(logo, (x, y), logo)
    return Image.alpha_composite(base, layer)


def burn_resize_watermark(
    src: Path,
    dest: Path,
    *,
    logo_ink: str | None = None,
    repo_root: Path | None = None,
) -> None:
    """Read image from ``src``, resize (max dims), embed watermark, write ``dest`` (suffix controls format).

    When ``logo_ink`` is ``black`` or ``silver`` (or ``GALLERY_LOGO_INK`` is set), burns the
    adubsqz logo into the bottom Polaroid margin instead of the corner © text plate.
    """
    opts = _publish_options()
    ink = _normalize_logo_ink(logo_ink) if logo_ink is not None else opts["logo_ink"]
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
            if ink is not None:
                im = _polaroid_logo_overlay(
                    im,
                    logo_ink=ink,
                    logo_width_frac=opts["logo_width_frac"],
                    logo_margin_frac=opts["logo_margin_frac"],
                    logo_opacity=opts["logo_opacity"],
                    repo_root=repo_root,
                )
            else:
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
