"""Tiny valid PNG fixtures for gallery tests."""

from pathlib import Path

import numpy as np
from PIL import Image


def write_one_pixel_png(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.new("RGB", (1, 1), (255, 0, 0)).save(path, format="PNG")


def write_sharp_noise_png(path: Path, size: int = 512) -> None:
    """RGB noise patch: passes screening; stays off highlight/shadow auto-prompt rails (mid-tones only)."""
    path.parent.mkdir(parents=True, exist_ok=True)
    rng = np.random.default_rng(0)
    arr = rng.integers(40, 216, size=(size, size, 3), dtype=np.uint8)
    Image.fromarray(arr).save(path, format="PNG")
