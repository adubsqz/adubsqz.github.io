"""Always-on technical screening + conservative auto-prompt hints for gallery import."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
from PIL import Image


class ScreeningRejected(RuntimeError):
    """Raised when an asset fails publish screening (never append manifest)."""

    def __init__(self, reasons: list[str]) -> None:
        self.reasons = reasons
        msg = "screening rejected: " + "; ".join(reasons)
        super().__init__(msg)


@dataclass
class ScreenResult:
    publish_allowed: bool
    reasons: list[str] = field(default_factory=list)
    # Natural-language hint for photo-prompt; empty if none needed.
    suggested_prompt: str = ""
    # Diagnostics for operators / logs
    laplacian_variance: float = 0.0
    min_edge_px: int = 0
    luma_std: float = 0.0
    pct_near_black: float = 0.0
    pct_near_white: float = 0.0


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
        raise ValueError(f"environment variable {key!r} must be a float, got {raw!r}") from e


def _lanczos():
    try:
        return Image.Resampling.LANCZOS
    except AttributeError:
        return Image.LANCZOS  # Pillow <10


def _laplacian_variance(gray: np.ndarray) -> float:
    """Variance of a 4-neighbor Laplacian on float grayscale (interior only)."""
    if gray.shape[0] < 3 or gray.shape[1] < 3:
        return 0.0
    g = gray.astype(np.float64)
    lap = (
        -4.0 * g[1:-1, 1:-1]
        + g[:-2, 1:-1]
        + g[2:, 1:-1]
        + g[1:-1, :-2]
        + g[1:-1, 2:]
    )
    return float(lap.var())


def _rgb_to_gray(arr: np.ndarray) -> np.ndarray:
    r = arr[..., 0].astype(np.float64)
    gch = arr[..., 1].astype(np.float64)
    b = arr[..., 2].astype(np.float64)
    return 0.299 * r + 0.587 * gch + 0.114 * b


def _mean_saturation(rgb: np.ndarray) -> float:
    """Mean per-pixel saturation in [0, 1] (RGB uint8)."""
    r = rgb[..., 0].astype(np.float64) / 255.0
    gch = rgb[..., 1].astype(np.float64) / 255.0
    b = rgb[..., 2].astype(np.float64) / 255.0
    mx = np.maximum(np.maximum(r, gch), b)
    mn = np.minimum(np.minimum(r, gch), b)
    denom = np.where(mx < 1e-6, 1.0, mx)
    sat = (mx - mn) / denom
    return float(np.mean(sat))


def _build_suggested_prompt(
    *,
    is_color_bucket: bool,
    pct_near_black: float,
    pct_near_white: float,
    luma_std: float,
    mean_sat: float,
    cast_r_minus_b: float,
) -> str:
    """Conservative fragments (matches operator preference for subtle language)."""
    parts: list[str] = []

    if pct_near_black > _float_env("GALLERY_SCREEN_SHADOW_FRAC", 0.06):
        parts.append("lift shadows very slightly")
    if pct_near_white > _float_env("GALLERY_SCREEN_HIGHLIGHT_FRAC", 0.06):
        parts.append("pull highlights down very slightly")
    if luma_std < _float_env("GALLERY_SCREEN_LUMA_STD_MIN", 22.0):
        parts.append("a touch more contrast")
    if is_color_bucket and mean_sat < _float_env("GALLERY_SCREEN_SAT_MEAN_MIN", 0.12):
        parts.append("slight saturation increase")
    thr = _float_env("GALLERY_SCREEN_CAST_RB", 0.035) * 255.0
    if cast_r_minus_b > thr:
        parts.append("cooler tone, very slight")
    elif cast_r_minus_b < -thr:
        parts.append("warmer tone, very slight")

    max_parts = max(1, _int_env("GALLERY_SCREEN_PROMPT_MAX_PARTS", 8))
    trimmed = parts[:max_parts]
    return ", ".join(trimmed)


def screen_asset(path: Path, *, bucket: str) -> ScreenResult:
    """
    Technical gate + optional auto-prompt. ``bucket`` controls color-aware hints (``color`` vs others).
    """
    min_edge = _int_env("GALLERY_SCREEN_MIN_EDGE", 400)
    blur_min = _float_env("GALLERY_SCREEN_BLUR_MIN_VAR", 20.0)
    lap_max_edge = _int_env("GALLERY_SCREEN_LAP_MAX_EDGE", 1024)

    p = path.expanduser().resolve()
    if not p.is_file():
        return ScreenResult(False, reasons=[f"not a file: {p}"])

    is_color_bucket = bucket.strip().lower() == "color"

    try:
        with Image.open(p) as im:
            im.load()
            w, h = im.size
            rgb = im.convert("RGB")
            full = np.array(rgb, dtype=np.uint8)
    except OSError as e:
        return ScreenResult(False, reasons=[f"unreadable image: {e}"])

    edge = min(w, h)
    if edge < min_edge:
        return ScreenResult(
            False,
            reasons=[f"dimensions below minimum ({edge}px < {min_edge}px)"],
            min_edge_px=edge,
        )

    # Downscale for stable Laplacian / stats
    long_edge = max(full.shape[0], full.shape[1])
    if long_edge > lap_max_edge:
        scale = lap_max_edge / float(long_edge)
        nh = max(3, int(round(full.shape[0] * scale)))
        nw = max(3, int(round(full.shape[1] * scale)))
        small = Image.fromarray(full).resize((nw, nh), _lanczos())
        arr = np.array(small, dtype=np.uint8)
    else:
        arr = full

    gray = _rgb_to_gray(arr)
    lap_var = _laplacian_variance(gray)
    if lap_var < blur_min:
        return ScreenResult(
            False,
            reasons=[f"too soft or lacking detail (laplacian_var={lap_var:.1f} < {blur_min})"],
            laplacian_variance=lap_var,
            min_edge_px=edge,
        )

    luma_std = float(np.std(gray))
    pct_near_black = float(np.mean(gray < 8.0))
    pct_near_white = float(np.mean(gray > 247.0))
    mean_sat = _mean_saturation(arr) if is_color_bucket else 0.0
    rf = float(np.mean(arr[..., 0].astype(np.float64)))
    bf = float(np.mean(arr[..., 2].astype(np.float64)))
    cast_rb = rf - bf

    suggested = _build_suggested_prompt(
        is_color_bucket=is_color_bucket,
        pct_near_black=pct_near_black,
        pct_near_white=pct_near_white,
        luma_std=luma_std,
        mean_sat=mean_sat,
        cast_r_minus_b=cast_rb,
    )

    return ScreenResult(
        True,
        reasons=[],
        suggested_prompt=suggested,
        laplacian_variance=lap_var,
        min_edge_px=edge,
        luma_std=luma_std,
        pct_near_black=pct_near_black,
        pct_near_white=pct_near_white,
    )
