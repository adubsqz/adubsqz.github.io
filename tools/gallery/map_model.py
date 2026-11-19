from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class MapEntry:
    source: Path
    bucket: str
    link_mode: str
    dest_basename: str
    photo_prompt: str | None


def load_map(map_path: Path) -> list[MapEntry]:
    raw = json.loads(map_path.read_text(encoding="utf-8"))
    if isinstance(raw, dict) and isinstance(raw.get("entries"), list):
        rows = raw["entries"]
    else:
        raise ValueError('Gallery map JSON must be an object with "entries": [...]')

    out: list[MapEntry] = []
    for i, row in enumerate(rows):
        out.append(_row_to_entry(row, i + 1))
    return out


def _row_to_entry(row: Any, lineno: int) -> MapEntry:
    if not isinstance(row, dict):
        raise ValueError(f"entries[{lineno}] must be object")
    try:
        source = Path(str(row["source"]))
        bucket = str(row["bucket"]).strip().lower()
        link_mode = str(row["link_mode"]).strip().lower()
    except KeyError as e:
        missing = e.args[0]
        raise ValueError(f"entries[{lineno}] missing field: {missing}") from e

    pb = row.get("photo_prompt")
    if pb is None:
        photo_prompt: str | None = None
    else:
        sp = str(pb).strip()
        photo_prompt = sp or None

    dest_override = row.get("dest_basename")
    if dest_override:
        basename = Path(str(dest_override)).name
    else:
        basename = Path(str(row["source"])).name
    if basename in {"", ".", ".."}:
        raise ValueError(f"entries[{lineno}] dest_basename/basename invalid")

    return MapEntry(
        source=source,
        bucket=bucket,
        link_mode=link_mode,
        dest_basename=basename,
        photo_prompt=photo_prompt,
    )
