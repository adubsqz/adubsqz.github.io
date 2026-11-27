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
                    {
                        "source": "p/polaroid.jpg",
                        "bucket": "color",
                        "link_mode": "copy",
                        "logo_ink": "silver",
                        "dest_basename": "polaroid-skyline.jpg",
                    },
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
    assert rows[0].logo_ink is None
    assert rows[1].photo_prompt is None
    assert rows[2].logo_ink == "silver"
    assert rows[2].dest_basename == "polaroid-skyline.jpg"


def test_rejects_bad_logo_ink(tmp_path: Path):
    p = tmp_path / "map.json"
    p.write_text(
        json.dumps(
            {
                "entries": [
                    {"source": "a.jpg", "bucket": "color", "link_mode": "copy", "logo_ink": "gold"},
                ]
            }
        ),
        encoding="utf-8",
    )
    with pytest.raises(ValueError, match="logo_ink"):
        load_map(p)


def test_logo_ink_empty_or_whitespace_becomes_none(tmp_path: Path):
    p = tmp_path / "map.json"
    p.write_text(
        json.dumps(
            {
                "entries": [
                    {"source": "a.jpg", "bucket": "color", "link_mode": "copy", "logo_ink": ""},
                    {"source": "b.jpg", "bucket": "color", "link_mode": "copy", "logo_ink": "  "},
                ]
            }
        ),
        encoding="utf-8",
    )
    rows = load_map(p)
    assert rows[0].logo_ink is None
    assert rows[1].logo_ink is None


def test_logo_ink_normalizes_case(tmp_path: Path):
    p = tmp_path / "map.json"
    p.write_text(
        json.dumps(
            {
                "entries": [
                    {"source": "a.jpg", "bucket": "color", "link_mode": "copy", "logo_ink": "BLACK"},
                    {"source": "b.jpg", "bucket": "color", "link_mode": "copy", "logo_ink": " Silver "},
                ]
            }
        ),
        encoding="utf-8",
    )
    rows = load_map(p)
    assert rows[0].logo_ink == "black"
    assert rows[1].logo_ink == "silver"


def test_rejects_outer_array(tmp_path: Path):
    p = tmp_path / "bad.json"
    p.write_text("[]", encoding="utf-8")
    with pytest.raises(ValueError):
        load_map(p)
