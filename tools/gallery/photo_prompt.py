from __future__ import annotations

import os
import subprocess
from pathlib import Path


def resolved_photo_prompt_bin() -> str:
    exe = os.environ.get("GALLERY_PHOTO_PROMPT", "").strip()
    if exe:
        return exe
    home = Path.home()
    candidates = (
        home / "photography" / "photo-prompt" / ".venv" / "bin" / "photo-prompt",
        home / "photo-prompt" / ".venv" / "bin" / "photo-prompt",
    )
    for cand in candidates:
        if cand.is_file():
            return str(cand)
    return "photo-prompt"


def run_photo_prompt_edit(
    input_abs: Path,
    prompt: str,
    output_abs: Path,
    *,
    recipe_out: Path,
    sidecar_out: Path,
) -> None:
    bin_path = resolved_photo_prompt_bin()
    timeout = int(os.environ.get("GALLERY_PHOTO_PROMPT_TIMEOUT", "240"))
    argv = [
        bin_path,
        "edit",
        "--input",
        str(input_abs),
        "--prompt",
        prompt,
        "--output",
        str(output_abs),
        "--recipe-out",
        str(recipe_out),
        "--sidecar",
        str(sidecar_out),
    ]
    model = os.environ.get("GALLERY_PHOTO_PROMPT_MODEL", "").strip()
    if model:
        argv.extend(["--model", model])

    subprocess.run(argv, check=True, timeout=timeout)
