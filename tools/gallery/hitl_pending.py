"""Pending human review queue for HITL gallery imports (see ``run_promote``)."""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path
from gallery.config import HITL_PENDING_REL


@dataclass
class PendingEntry:
    token: str
    import_bucket: str
    dest_basename: str
    source: str
    staged_rel: str


def _pending_path(repo: Path) -> Path:
    return repo / HITL_PENDING_REL


def load_pending_entries(repo: Path) -> list[PendingEntry]:
    p = _pending_path(repo)
    if not p.is_file():
        return []
    raw = json.loads(p.read_text(encoding="utf-8"))
    rows = raw.get("entries")
    if not isinstance(rows, list):
        return []
    out: list[PendingEntry] = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        try:
            out.append(
                PendingEntry(
                    token=str(row["token"]),
                    import_bucket=str(row["import_bucket"]),
                    dest_basename=str(row["dest_basename"]),
                    source=str(row.get("source", "")),
                    staged_rel=str(row["staged_rel"]),
                )
            )
        except KeyError:
            continue
    return out


def save_pending_entries(repo: Path, entries: list[PendingEntry]) -> None:
    p = _pending_path(repo)
    p.parent.mkdir(parents=True, exist_ok=True)
    payload = {"entries": [asdict(e) for e in entries]}
    p.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def upsert_pending(repo: Path, entry: PendingEntry) -> None:
    cur = load_pending_entries(repo)
    by_tok = {e.token: e for e in cur}
    by_tok[entry.token] = entry
    save_pending_entries(repo, list(by_tok.values()))


def remove_tokens(repo: Path, tokens: set[str]) -> int:
    cur = load_pending_entries(repo)
    n_before = len(cur)
    kept = [e for e in cur if e.token not in tokens]
    save_pending_entries(repo, kept)
    return n_before - len(kept)


def rel_from_repo(repo: Path, abs_path: Path) -> str:
    try:
        return abs_path.resolve().relative_to(repo.resolve()).as_posix()
    except ValueError:
        return str(abs_path)
