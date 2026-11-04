import pytest

from gallery.manifest_entry import entry_token


def test_entry_token_plain_string() -> None:
    assert entry_token("bw/foo.jpg", "bw") == "bw/foo.jpg"
    assert entry_token("foo.jpg", "color") == "color/foo.jpg"


def test_entry_token_object() -> None:
    row = {"path": "bw/bar.jpg", "palette": "cool", "vibe": ["moody"]}
    assert entry_token(row, "bw") == "bw/bar.jpg"


def test_entry_token_object_missing_path() -> None:
    with pytest.raises(ValueError):
        entry_token({"palette": "warm"}, "color")
