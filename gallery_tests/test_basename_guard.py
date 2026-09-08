import pytest

from gallery.basename_guard import assert_allowed_publish_basename


def test_allows_plain_jpeg():
    assert_allowed_publish_basename("balconysunset.jpeg")


def test_allows_renamed_scan_ids_and_importone():
    assert_allowed_publish_basename("bear12.jpg")
    assert_allowed_publish_basename("importone.jpg")
    assert_allowed_publish_basename("30570008-kiln.JPG")


def test_allows_png():
    assert_allowed_publish_basename("x.png")


def test_rejects_import_numeric():
    with pytest.raises(ValueError, match=r"import"):
        assert_allowed_publish_basename("import-12.jpg")


def test_rejects_digits_only():
    with pytest.raises(ValueError, match=r"digits"):
        assert_allowed_publish_basename("000123.jpg")


def test_rejects_bad_extension():
    with pytest.raises(ValueError):
        assert_allowed_publish_basename("x.gif")
