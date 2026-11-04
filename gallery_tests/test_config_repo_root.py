from pathlib import Path

from gallery.config import repo_root


def test_repo_root_honors_gallery_repo_root(monkeypatch, tmp_path):
    monkeypatch.chdir(tmp_path)
    root = tmp_path / "proj"
    root.mkdir(parents=True)
    (root / "package.json").write_text("{}", encoding="utf-8")
    monkeypatch.setenv("GALLERY_REPO_ROOT", str(root))
    assert repo_root() == root
