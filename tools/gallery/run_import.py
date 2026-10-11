from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path

from gallery.basename_guard import assert_allowed_publish_basename
from gallery.config import ALLOWED_LINK_MODES, repo_root
from gallery.hitl_pending import PendingEntry, rel_from_repo, upsert_pending
from gallery.map_model import load_map
from gallery.manifest_store import append_if_absent
from gallery.paths_publish import manifest_token, publish_file_for, sheet_file_for, staging_file_for
from gallery.optimize_publish import burn_resize_watermark, write_sheet_thumb
from gallery.photo_prompt import run_photo_prompt_edit
from gallery.screen_asset import ScreenResult, ScreeningRejected, screen_asset


def _resolve_source(repo: Path, source: Path) -> Path:
    s = source.expanduser()
    if s.is_absolute():
        return s.resolve()
    return (repo / s).resolve()


def _optimized_stage_path(repo: Path, dest_basename: str) -> Path:
    d = repo / ".tmp" / "optimized"
    d.mkdir(parents=True, exist_ok=True)
    return d / dest_basename


def _stage_for_edit(repo: Path, source_abs: Path, dest_basename: str) -> Path:
    review = repo / ".tmp/review"
    staged = review / dest_basename
    review.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source_abs, staged)
    return staged


def _truthy_env(key: str) -> bool:
    return os.environ.get(key, "").strip().lower() in ("1", "true", "yes")


def _install_publish(
    repo: Path, work: Path, dest: Path, link_mode: str, dry_run: bool, *, replace: bool
) -> None:
    link_mode = link_mode.strip().lower()
    if dry_run:
        return
    if link_mode not in ALLOWED_LINK_MODES:
        raise ValueError(f"invalid link_mode {link_mode!r}")
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        if not replace:
            raise FileExistsError(str(dest))
        dest.unlink()
    tmp_root = (repo / ".tmp").resolve()
    try:
        work_res = work.resolve()
    except OSError:
        work_res = work
    fragile_tmp = False
    if link_mode == "symlink":
        try:
            fragile_tmp = work_res == tmp_root or work_res.is_relative_to(tmp_root)
        except AttributeError:
            fragile_tmp = str(work_res).startswith(str(tmp_root) + "/") or work_res == tmp_root
        if fragile_tmp:
            print(
                "gallery-import: link_mode=symlink pointed at .tmp; materializing a copy under publish/staging "
                "so the deployed file does not reference ephemeral paths.",
                file=sys.stderr,
            )
            shutil.copy2(work, dest)
            return
    if link_mode == "copy":
        shutil.copy2(work, dest)
    else:
        dest.symlink_to(work.resolve(), target_is_directory=False)


def process_entry(repo: Path, entry, dry_run: bool, *, replace: bool, stage_only: bool) -> str:
    if entry.bucket not in ("bw", "color", "redscale", "people", "still-life", "about"):
        raise ValueError(f"invalid bucket {entry.bucket!r}")
    if entry.link_mode not in ALLOWED_LINK_MODES:
        raise ValueError(f"invalid link_mode {entry.link_mode!r}")

    assert_allowed_publish_basename(entry.dest_basename)
    token = manifest_token(entry.bucket, entry.dest_basename)
    source_abs = _resolve_source(repo, entry.source)
    if not source_abs.is_file():
        raise FileNotFoundError(f"source not found: {source_abs}")

    dest = staging_file_for(repo, entry.bucket, entry.dest_basename) if stage_only else publish_file_for(
        repo, entry.bucket, entry.dest_basename
    )

    if not dry_run and dest.exists() and not replace:
        print(f"[import] skipping {entry.dest_basename}: already published (use --replace to force)")
        return f"skipped: {entry.dest_basename} already exists"

    screen: ScreenResult = screen_asset(source_abs, bucket=entry.bucket)
    explicit_prompt = (entry.photo_prompt or "").strip()
    if _truthy_env("GALLERY_IMPORT_SKIP_AUTO_PROMPT"):
        effective_prompt = explicit_prompt
    else:
        effective_prompt = explicit_prompt or (screen.suggested_prompt.strip() if screen.suggested_prompt else "")

    if dry_run:
        if not screen.publish_allowed:
            return f"[dry-run] screening would reject ({'; '.join(screen.reasons)})"
        steps = [
            f"screen ok (lap_var={screen.laplacian_variance:.1f}, min_edge={screen.min_edge_px})",
        ]
        if effective_prompt:
            src = "map photo_prompt" if explicit_prompt else "auto_prompt"
            steps.append(f"photo-prompt ({src})")
        steps.append("resize+watermark")
        tail = f"HITL stage -> {dest} (not public/manifest yet)" if stage_only else f"publish ({entry.link_mode}) -> {dest} manifest={token!r}"
        steps.append(tail)
        verb = " + ".join(steps[:-1]) + " | " + steps[-1]
        prompt_note = f' prompt={effective_prompt[:80]!r}…' if len(effective_prompt) > 80 else f" prompt={effective_prompt!r}" if effective_prompt else ""
        return f"[dry-run] would {verb}{prompt_note}"

    if not screen.publish_allowed:
        raise ScreeningRejected(screen.reasons)

    staged = _stage_for_edit(repo, source_abs, entry.dest_basename)
    print(f"[import] staged for edit: {staged}")
    print(
        "gallery-import: screening passed "
        f"(lap_var={screen.laplacian_variance:.1f}, luma_std={screen.luma_std:.1f}, "
        f"shadow%={screen.pct_near_black * 100:.1f}, highlight%={screen.pct_near_white * 100:.1f})",
        file=sys.stderr,
    )

    work_abs = staged
    if effective_prompt:
        edited = repo / ".tmp/edited"
        edited.mkdir(parents=True, exist_ok=True)
        out_abs = edited / entry.dest_basename
        if out_abs.exists():
            out_abs.unlink()
        stem = Path(entry.dest_basename).stem
        recipe = edited / f"{stem}.recipe.json"
        sidecar = edited / f"{stem}.sidecar.json"
        if explicit_prompt:
            print("gallery-import: photo-prompt (map)", file=sys.stderr)
        else:
            print(f"gallery-import: photo-prompt (auto) {effective_prompt!r}", file=sys.stderr)
        run_photo_prompt_edit(
            staged,
            effective_prompt,
            out_abs,
            recipe_out=recipe,
            sidecar_out=sidecar,
        )
        print(f"[import] photo-prompt output: {out_abs}")
        if recipe.exists():
            print(f"[import] recipe: {recipe}")
        if sidecar.exists():
            print(f"[import] sidecar: {sidecar}")
        work_abs = out_abs

    opt_abs = _optimized_stage_path(repo, entry.dest_basename)
    if opt_abs.exists():
        opt_abs.unlink()
    burn_resize_watermark(work_abs, opt_abs)
    print(f"[import] optimized: {opt_abs}")

    _install_publish(repo, opt_abs, dest, entry.link_mode, dry_run=False, replace=replace)
    if stage_only:
        upsert_pending(
            repo,
            PendingEntry(
                token=token,
                import_bucket=entry.bucket,
                dest_basename=entry.dest_basename,
                source=str(source_abs),
                staged_rel=rel_from_repo(repo, dest.resolve()),
            ),
        )
        print(
            "gallery-import: HITL — review under .tmp/gallery-hitl then: "
            "npm run gallery:promote -- --tokens …",
            file=sys.stderr,
        )
        return f"staged (HITL): {token} -> {dest}"

    # Contact-sheet thumb after public publish (not during HITL stage-only).
    if entry.bucket not in ("about", "still-life"):
        sheet_dest = sheet_file_for(repo, entry.bucket, entry.dest_basename)
        write_sheet_thumb(opt_abs, sheet_dest)
        print(f"[import] sheet thumb: {sheet_dest}")

    appended = append_if_absent(repo, entry.bucket, token)
    if not appended:
        return f"publisher: already in manifest ({token})"
    return f"ok: {token}"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Import gallery rows from curation map JSON.")
    parser.add_argument("--map", type=Path, required=True, help="path to gallery map JSON (entries)")
    parser.add_argument("--dry-run", action="store_true", help="validate and print intentions only")
    parser.add_argument("--limit", type=int, default=0, help="optional max rows processed (default 0 = all)")
    parser.add_argument(
        "--replace",
        action="store_true",
        help="overwrite existing publish targets (same dest_basename) instead of failing",
    )
    parser.add_argument(
        "--stage-only",
        action="store_true",
        help="write optimized files to .tmp/gallery-hitl only; use gallery:promote after human review (never touches public/ or gallery-manifest.json)",
    )
    args = parser.parse_args(argv)

    repo = repo_root()
    mp = args.map.expanduser().resolve()
    rows = load_map(mp)
    lim = args.limit if args.limit > 0 else len(rows)

    processed = 0
    dry_run_reject = False
    try:
        for entry in rows[:lim]:
            msg = process_entry(
                repo,
                entry,
                dry_run=args.dry_run,
                replace=args.replace,
                stage_only=args.stage_only,
            )
            print(msg)
            if args.dry_run and "screening would reject" in msg:
                dry_run_reject = True
            processed += 1
    except (OSError, ValueError, subprocess.CalledProcessError, ScreeningRejected) as exc:
        print(f"gallery-import: stopped after {processed} row(s): {exc}")
        return 1
    if dry_run_reject:
        print("gallery-import: dry-run exit 1 (one or more rows failed screening)", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
