import json
from pathlib import Path

import pytest

from gallery.map_model import load_map


def test_load_map_basic(tmp_path: Path):
    p = tmp_path / "map.json"
    p.write_text(
        json.dumps(
            {
                "entries": [
                    {"source": "a/b.jpg", "bucket": "bw", "link_mode": "copy", "photo_prompt": " warm "},
                    {"source": "c/d.png", "bucket": "color", "link_mode": "symlink"},
                ]
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    rows = load_map(p)
    assert rows[0].bucket == "bw"
    assert rows[0].link_mode == "copy"
    assert rows[0].photo_prompt == "warm"
    assert rows[1].photo_prompt is None


def test_rejects_outer_array(tmp_path: Path):
    p = tmp_path / "bad.json"
    p.write_text("[]", encoding="utf-8")
    with pytest.raises(ValueError):
        load_map(p)
