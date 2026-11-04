from pathlib import Path
from unittest.mock import patch

from gallery.photo_prompt import resolved_photo_prompt_bin, run_photo_prompt_edit


def test_resolved_honors_env(monkeypatch):
    monkeypatch.setenv("GALLERY_PHOTO_PROMPT", "/opt/pp/bin/photo-prompt")
    assert resolved_photo_prompt_bin() == "/opt/pp/bin/photo-prompt"


def test_resolved_prefers_photography_sibling(monkeypatch, tmp_path):
    monkeypatch.delenv("GALLERY_PHOTO_PROMPT", raising=False)
    fake_home = tmp_path
    sibling = fake_home / "photography" / "photo-prompt" / ".venv" / "bin"
    sibling.mkdir(parents=True)
    cli = sibling / "photo-prompt"
    cli.write_text("#!/bin/sh\nexit 0\n")
    cli.chmod(0o755)
    monkeypatch.setattr("gallery.photo_prompt.Path.home", staticmethod(lambda: fake_home))
    assert resolved_photo_prompt_bin() == str(cli)


def test_resolved_falls_back_to_legacy_home(monkeypatch, tmp_path):
    monkeypatch.delenv("GALLERY_PHOTO_PROMPT", raising=False)
    fake_home = tmp_path
    legacy = fake_home / "photo-prompt" / ".venv" / "bin"
    legacy.mkdir(parents=True)
    cli = legacy / "photo-prompt"
    cli.write_text("#!/bin/sh\nexit 0\n")
    cli.chmod(0o755)
    monkeypatch.setattr("gallery.photo_prompt.Path.home", staticmethod(lambda: fake_home))
    assert resolved_photo_prompt_bin() == str(cli)


def test_resolved_returns_bare_name_when_missing(monkeypatch, tmp_path):
    monkeypatch.delenv("GALLERY_PHOTO_PROMPT", raising=False)
    monkeypatch.setattr("gallery.photo_prompt.Path.home", staticmethod(lambda: tmp_path))
    assert resolved_photo_prompt_bin() == "photo-prompt"


@patch("gallery.photo_prompt.subprocess.run")
def test_run_photo_prompt_invokes_cli(mock_run, tmp_path):
    inp = tmp_path / "in.jpg"
    outp = tmp_path / "edited" / "out.jpg"
    recipe = tmp_path / "r.json"
    side = tmp_path / "s.sidecar.json"
    inp.write_bytes(b"a")
    run_photo_prompt_edit(inp, "warm shadows", outp, recipe_out=recipe, sidecar_out=side)
    args, kw = mock_run.call_args
    argv = args[0]
    assert argv[1] == "edit"
    assert "--prompt" in argv
    i = argv.index("--prompt")
    assert argv[i + 1] == "warm shadows"
    assert kw.get("check") is True

