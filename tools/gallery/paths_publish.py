from __future__ import annotations

from pathlib import Path

from gallery.config import (
    ALLOWED_BUCKETS,
    HITL_STAGING_STILL_LIFE_REL,
    PUBLISH_SHEET_REL,
    PUBLISH_STILL_LIFE_REL,
)


def publish_file_for(repo: Path, bucket: str, dest_basename: str) -> Path:
    bucket = bucket.lower().strip()
    if bucket not in ALLOWED_BUCKETS:
        raise ValueError(f"invalid bucket {bucket!r}; expected one of {sorted(ALLOWED_BUCKETS)}")
    pub = repo / PUBLISH_STILL_LIFE_REL
    if bucket in ("still-life", "about"):
        return pub / dest_basename
    return pub / bucket / dest_basename


def sheet_file_for(repo: Path, bucket: str, dest_basename: str) -> Path:
    """Contact-sheet thumb path mirroring ``publish_file_for`` under ``public/photos/sheet/``."""
    bucket = bucket.lower().strip()
    if bucket not in ALLOWED_BUCKETS:
        raise ValueError(f"invalid bucket {bucket!r}; expected one of {sorted(ALLOWED_BUCKETS)}")
    pub = repo / PUBLISH_SHEET_REL
    if bucket in ("still-life", "about"):
        return pub / dest_basename
    return pub / bucket / dest_basename


def staging_file_for(repo: Path, bucket: str, dest_basename: str) -> Path:
    """HITL staging path (mirrors ``publish_file_for`` layout under ``.tmp/gallery-hitl/``)."""
    bucket = bucket.lower().strip()
    if bucket not in ALLOWED_BUCKETS:
        raise ValueError(f"invalid bucket {bucket!r}; expected one of {sorted(ALLOWED_BUCKETS)}")
    pub = repo / HITL_STAGING_STILL_LIFE_REL
    if bucket in ("still-life", "about"):
        return pub / dest_basename
    return pub / bucket / dest_basename


def manifest_token(bucket: str, dest_basename: str) -> str:
    bucket = bucket.lower().strip()
    if bucket in ("still-life", "about"):
        return dest_basename
    return Path(bucket, dest_basename).as_posix()
