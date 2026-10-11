"""Promote HITL-staged gallery files into ``public/`` and optionally append ``gallery-manifest.json``."""

from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

from gallery.config import repo_root
from gallery.hitl_pending import PendingEntry, load_pending_entries, remove_tokens
from gallery.manifest_entry import entry_token
from gallery.manifest_store import append_if_absent, load_manifest
from gallery.optimize_publish import write_sheet_thumb
from gallery.paths_publish import publish_file_for, sheet_file_for


def _tokens_in_manifest(repo: Path, token: str) -> bool:
    data = load_manifest(repo)
    for key, items in data.items():
        for raw in items:
            try:
                if entry_token(raw, key) == token:
                    return True
            except ValueError:
                continue
    return False


def promote_one(
    repo: Path,
    entry: PendingEntry,
    *,
    dry_run: bool,
    replace: bool,
) -> str:
    staged = (repo / entry.staged_rel).resolve()
    if not staged.is_file():
        return f"skip: missing staged file {staged}"

    dest = publish_file_for(repo, entry.import_bucket, entry.dest_basename)
    if dest.exists() and not replace:
        return f"error: public exists (use --replace): {dest}"

    if dry_run:
        in_manifest = _tokens_in_manifest(repo, entry.token)
        return f"[dry-run] would copy {staged} -> {dest} manifest_append={not in_manifest}"

    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        dest.unlink()
    shutil.copy2(staged, dest)
    try:
        staged.unlink()
    except OSError:
        pass

    if entry.import_bucket not in ("about", "still-life"):
        sheet_dest = sheet_file_for(repo, entry.import_bucket, entry.dest_basename)
        write_sheet_thumb(dest, sheet_dest)

    if not _tokens_in_manifest(repo, entry.token):
        appended = append_if_absent(repo, entry.import_bucket, entry.token)
        if not appended:
            return f"ok: copied {entry.token} (manifest row already present)"
        return f"ok: copied + manifest {entry.token}"
    return f"ok: copied {entry.token} (already in manifest)"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Promote HITL-staged images from .tmp/gallery-hitl into public/ + manifest.",
    )
    parser.add_argument("--list", action="store_true", help="print pending queue and exit")
    parser.add_argument("--dry-run", action="store_true", help="show what would be promoted")
    parser.add_argument(
        "--approve-all",
        action="store_true",
        help="promote every pending entry (after review)",
    )
    parser.add_argument(
        "--tokens",
        nargs="*",
        default=[],
        help="manifest tokens to promote e.g. color/foo.jpg bw/bar.jpg",
    )
    parser.add_argument(
        "--replace",
        action="store_true",
        help="overwrite existing files under public/photos/still-life/",
    )
    parser.add_argument(
        "--drop-tokens",
        nargs="*",
        metavar="TOKEN",
        help="remove these manifest tokens from the pending queue without promoting (optional: delete matching files under .tmp/gallery-hitl yourself)",
    )
    args = parser.parse_args(argv)

    repo = repo_root()
    pending = load_pending_entries(repo)

    if args.list:
        if not pending:
            print("gallery-promote: pending queue is empty")
            return 0
        for e in pending:
            print(f"{e.token}\n  staged: {e.staged_rel}\n  source: {e.source}\n")
        return 0

    if args.drop_tokens:
        drops = set(args.drop_tokens)
        for e in load_pending_entries(repo):
            if e.token in drops:
                staged = (repo / e.staged_rel).resolve()
                if staged.is_file():
                    try:
                        staged.unlink()
                    except OSError:
                        pass
        n = remove_tokens(repo, drops)
        print(f"gallery-promote: dropped {n} pending entr(y/ies)", file=sys.stderr)
        return 0

    if args.approve_all and not pending:
        print("gallery-promote: pending queue is empty", file=sys.stderr)
        return 0

    if not args.approve_all and not args.tokens:
        print(
            "gallery-promote: specify --list, --drop-tokens, --approve-all, or --tokens color/a.jpg bw/b.jpg",
            file=sys.stderr,
        )
        return 2

    want: set[str] = set(args.tokens) if args.tokens else {e.token for e in pending}
    selected = [e for e in pending if e.token in want]
    missing_tok = want - {e.token for e in selected}
    if missing_tok:
        print(f"gallery-promote: unknown token(s) in pending: {sorted(missing_tok)}", file=sys.stderr)
        return 1
    if not selected:
        print("gallery-promote: no matching pending entries", file=sys.stderr)
        return 0

    promoted: list[str] = []
    errors: list[str] = []
    for e in selected:
        msg = promote_one(repo, e, dry_run=args.dry_run, replace=args.replace)
        print(msg)
        if msg.startswith("error:"):
            errors.append(e.token)
        elif not msg.startswith("skip:"):
            promoted.append(e.token)

    if args.dry_run:
        return 1 if errors else 0

    if errors:
        return 1

    n = remove_tokens(repo, set(promoted))
    if n:
        print(f"gallery-promote: removed {n} entr(y/ies) from pending.json", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
