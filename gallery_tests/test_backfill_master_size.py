"""Tmp-image tests for original-scan pixel backfill (no live photos)."""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

import pytest
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))

from backfill_master_size import (  # noqa: E402
    backfill_master_size,
    originals_dir,
    parse_args,
    repo_root,
)

BUCKETS = ("about", "bw", "color", "redscale", "people")


def _write_jpeg(path: Path, width: int, height: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.new("RGB", (width, height), (12, 34, 56)).save(path, format="JPEG", quality=90)


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _empty_manifest(**buckets: list) -> dict:
    data = {key: [] for key in BUCKETS}
    data.update(buckets)
    return data


def _repo_with_manifest(tmp_path: Path, manifest: dict) -> tuple[Path, Path]:
    repo = tmp_path / "repo"
    (repo / "src").mkdir(parents=True)
    path = repo / "src" / "gallery-manifest.json"
    path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return repo, path


def test_dry_run_default_does_not_write_manifest(tmp_path: Path) -> None:
    originals = tmp_path / "originals"
    _write_jpeg(originals / "scan-otter.jpg", 4000, 3000)
    repo, manifest_path = _repo_with_manifest(
        tmp_path,
        _empty_manifest(bw=[{"path": "bw/scan-otter.jpg", "orientation": "horizontal"}]),
    )
    before = manifest_path.read_text(encoding="utf-8")

    result = backfill_master_size(
        manifest_path=manifest_path,
        originals=originals,
        write=False,
    )

    assert result.wrote is False
    assert len(result.updates) == 1
    assert result.updates[0].master_width == 4000
    assert result.updates[0].master_height == 3000
    assert manifest_path.read_text(encoding="utf-8") == before
    loaded = json.loads(before)
    assert "master_width" not in loaded["bw"][0]


def test_write_sets_master_pixels_on_object_rows(tmp_path: Path) -> None:
    originals = tmp_path / "originals"
    _write_jpeg(originals / "nested" / "scan-otter.jpg", 5120, 4096)
    repo, manifest_path = _repo_with_manifest(
        tmp_path,
        _empty_manifest(bw=[{"path": "bw/scan-otter.jpg", "orientation": "horizontal"}]),
    )

    result = backfill_master_size(
        manifest_path=manifest_path,
        originals=originals,
        write=True,
    )

    assert result.wrote is True
    row = json.loads(manifest_path.read_text(encoding="utf-8"))["bw"][0]
    assert row["path"] == "bw/scan-otter.jpg"
    assert row["orientation"] == "horizontal"
    assert row["master_width"] == 5120
    assert row["master_height"] == 4096


def test_write_does_not_modify_original_bytes(tmp_path: Path) -> None:
    originals = tmp_path / "originals"
    original = originals / "keep-me.jpg"
    _write_jpeg(original, 3200, 2400)
    digest = _sha256(original)
    mtime = original.stat().st_mtime_ns
    _, manifest_path = _repo_with_manifest(
        tmp_path,
        _empty_manifest(color=[{"path": "color/keep-me.jpg"}]),
    )

    backfill_master_size(manifest_path=manifest_path, originals=originals, write=True)

    assert _sha256(original) == digest
    assert original.stat().st_mtime_ns == mtime


def test_unmatched_dest_left_without_dimensions(tmp_path: Path) -> None:
    originals = tmp_path / "originals"
    originals.mkdir()
    _write_jpeg(originals / "other.jpg", 1000, 800)
    _, manifest_path = _repo_with_manifest(
        tmp_path,
        _empty_manifest(bw=[{"path": "bw/missing-frame.jpg", "orientation": "vertical"}]),
    )

    result = backfill_master_size(
        manifest_path=manifest_path,
        originals=originals,
        write=True,
    )

    assert result.unmatched == ["bw/missing-frame.jpg"]
    row = json.loads(manifest_path.read_text(encoding="utf-8"))["bw"][0]
    assert "master_width" not in row
    assert "master_height" not in row


def test_dest_stem_suffix_matches_scan_id_original(tmp_path: Path) -> None:
    originals = tmp_path / "originals"
    _write_jpeg(originals / "30570008.JPG", 6000, 4000)
    _, manifest_path = _repo_with_manifest(
        tmp_path,
        _empty_manifest(bw=[{"path": "bw/30570008-kiln.JPG"}]),
    )

    result = backfill_master_size(
        manifest_path=manifest_path,
        originals=originals,
        write=True,
    )

    row = json.loads(manifest_path.read_text(encoding="utf-8"))["bw"][0]
    assert row["master_width"] == 6000
    assert row["master_height"] == 4000
    assert result.updates[0].original.name == "30570008.JPG"


def test_exact_basename_wins_over_scan_id_prefix(tmp_path: Path) -> None:
    originals = tmp_path / "originals"
    _write_jpeg(originals / "30570008.jpg", 1111, 2222)
    _write_jpeg(originals / "30570008-kiln.JPG", 3333, 4444)
    _, manifest_path = _repo_with_manifest(
        tmp_path,
        _empty_manifest(bw=[{"path": "bw/30570008-kiln.JPG"}]),
    )

    backfill_master_size(manifest_path=manifest_path, originals=originals, write=True)

    row = json.loads(manifest_path.read_text(encoding="utf-8"))["bw"][0]
    assert row["master_width"] == 3333
    assert row["master_height"] == 4444


def test_ambiguous_basename_is_skipped(tmp_path: Path) -> None:
    originals = tmp_path / "originals"
    _write_jpeg(originals / "a" / "dup.jpg", 100, 200)
    _write_jpeg(originals / "b" / "dup.jpg", 300, 400)
    _, manifest_path = _repo_with_manifest(
        tmp_path,
        _empty_manifest(people=[{"path": "people/dup.jpg"}]),
    )

    result = backfill_master_size(
        manifest_path=manifest_path,
        originals=originals,
        write=True,
    )

    assert "people/dup.jpg" in result.ambiguous
    row = json.loads(manifest_path.read_text(encoding="utf-8"))["people"][0]
    assert "master_width" not in row


def test_missing_originals_dir_is_noop(tmp_path: Path) -> None:
    _, manifest_path = _repo_with_manifest(
        tmp_path,
        _empty_manifest(bw=[{"path": "bw/x.jpg"}]),
    )
    before = manifest_path.read_text(encoding="utf-8")

    result = backfill_master_size(
        manifest_path=manifest_path,
        originals=tmp_path / "no-such-originals",
        write=True,
    )

    assert result.updates == []
    assert result.wrote is False
    assert manifest_path.read_text(encoding="utf-8") == before


def test_gallery_originals_env(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    originals = tmp_path / "from-env"
    originals.mkdir()
    monkeypatch.setenv("GALLERY_ORIGINALS", str(originals))
    assert originals_dir() == originals.resolve()


def test_default_originals_is_home_photography(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    home = tmp_path / "home"
    monkeypatch.delenv("GALLERY_ORIGINALS", raising=False)
    monkeypatch.setattr(Path, "home", classmethod(lambda cls: home))
    assert originals_dir() == home / "photography" / "originals"


def test_repo_root_honors_gallery_repo_root(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    root = tmp_path / "proj"
    root.mkdir()
    monkeypatch.setenv("GALLERY_REPO_ROOT", str(root))
    assert repo_root() == root.resolve()


def test_parse_args_dry_run_is_default() -> None:
    ns = parse_args([])
    assert ns.write is False


def test_parse_args_write_flag() -> None:
    ns = parse_args(["--write"])
    assert ns.write is True


def test_write_does_not_emit_photo_binaries(tmp_path: Path) -> None:
    originals = tmp_path / "originals"
    _write_jpeg(originals / "frame.jpg", 2000, 1500)
    repo, manifest_path = _repo_with_manifest(
        tmp_path,
        _empty_manifest(redscale=[{"path": "redscale/frame.jpg"}]),
    )

    backfill_master_size(manifest_path=manifest_path, originals=originals, write=True)

    photos = list(repo.rglob("*.jpg")) + list(repo.rglob("*.JPG")) + list(repo.rglob("*.jpeg"))
    assert photos == []
    assert (repo / "src" / "gallery-manifest.json").is_file()
