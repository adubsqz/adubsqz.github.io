"""Tests for ``gallery.screen_asset``."""

from pathlib import Path

import pytest

from gallery.screen_asset import screen_asset
from gallery_tests.fixtures import write_one_pixel_png, write_sharp_noise_png


def test_reject_tiny_dimensions(tmp_path: Path) -> None:
    p = tmp_path / "tiny.png"
    write_one_pixel_png(p)
    r = screen_asset(p, bucket="bw")
    assert not r.publish_allowed
    assert any("dimensions below minimum" in x for x in r.reasons)


def test_reject_uniform_flat(tmp_path: Path) -> None:
    """Flat gray has near-zero Laplacian variance in the interior."""
    from PIL import Image

    p = tmp_path / "flat.png"
    Image.new("RGB", (800, 800), (120, 120, 120)).save(p, format="PNG")
    r = screen_asset(p, bucket="bw")
    assert not r.publish_allowed
    assert any("too soft" in x or "laplacian" in x for x in r.reasons)


def test_pass_noise_bw_bucket(tmp_path: Path) -> None:
    p = tmp_path / "n.png"
    write_sharp_noise_png(p)
    r = screen_asset(p, bucket="bw")
    assert r.publish_allowed
    assert r.laplacian_variance > 35
    assert isinstance(r.suggested_prompt, str)


def test_color_bucket_can_suggest_saturation(tmp_path: Path) -> None:
    """Near-gray noisy image (high detail, low chroma) hints saturation for color bucket."""
    import numpy as np
    from PIL import Image

    p = tmp_path / "grayish.png"
    rng = np.random.default_rng(1)
    n = rng.integers(-10, 11, (420, 420))
    arr = np.stack(
        [
            np.clip(118 + n, 40, 215),
            np.clip(120 + n, 40, 215),
            np.clip(122 + n, 40, 215),
        ],
        axis=-1,
    ).astype(np.uint8)
    Image.fromarray(arr).save(p, format="PNG")
    r = screen_asset(p, bucket="color")
    assert r.publish_allowed
    assert "saturation" in r.suggested_prompt.lower()
