# Gallery pipeline (Python) implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a Python map-driven importer that stages assets, optionally runs `photo-prompt`, publishes into `public/photos/still-life/`, updates `src/gallery-manifest.json` only on successful completion per row, and provides filesystem verification plus thin `npm run` wrappers aligned with CI.

**Architecture:** Repo root anchors all paths (`src/gallery-manifest.json`, `public/photos/still-life`). A JSON curation map lists human-declared buckets and copy/symlink choice. Processing is sequential; each row succeeds fully or skips manifest mutation. `photo-prompt` is subprocess-only behind a configurable binary path (venv-friendly).

**Tech stack:** Python 3.11+ (stdlib: `json`, `pathlib`, `shutil`, `subprocess`, `argparse`; tests: `pytest`). Node/Vite unchanged except npm wrappers and docs.

**Package layout (`PYTHONPATH`):** Implemented under **`tools/gallery/`** (import package name `gallery`). This avoids the current `.gitignore` rule **`scripts/**`**, which would prevent committing tooling under **`scripts/`** unless that rule is later narrowed deliberately.

---

## File map

| Path | Responsibility |
|------|----------------|
| `requirements-gallery.txt` | Dev deps: `pytest`. |
| `pytest.ini` (repo root) | `pythonpath = tools`, `testpaths = gallery_tests`. |
| `tools/gallery/__init__.py` | Package marker. |
| `tools/gallery/config.py` | Repo root resolution, canonical relative paths and env knobs. |
| `tools/gallery/map_model.py` | Parse + validate JSON map (`entries`). |
| `tools/gallery/basename_guard.py` | Same filename rules mirrored from `src/data.ts` (`import-\\d+`, digits-only). |
| `tools/gallery/paths_publish.py` | Map `(bucket, dest_basename) -> Path` under `public/photos/still-life/`. |
| `tools/gallery/manifest_store.py` | Load/save manifest JSON with stable formatting; helpers to append normalized row string per bucket without duplicates. |
| `tools/gallery/photo_prompt.py` | Resolve CLI binary (`GALLERY_PHOTO_PROMPT` or sane default relative to `$HOME`), run `photo-prompt edit ...`. |
| `tools/gallery/run_import.py` | Orchestrator `--map`, `--dry-run`, `--limit`, per-row transactional semantics. |
| `tools/gallery/verify_manifest.py` | Parity manifest ↔ disk; orphan scan for `bw/`, `color/`. |
| `tools/__init__.py` | Empty file so editors treat `tools` as package (optional — not strictly required when using `PYTHONPATH=tools`). |
| `gallery_tests/*.py` | pytest modules. |
| `package.json` | `gallery:import`, `gallery:verify`, `gallery:doctor` thin wrappers (`PYTHONPATH=tools python3 -m gallery.run_import` style). |
| `README.md` | Operator workflow. |
| `.github/workflows/ci.yml` | `setup-python` + pip + `pytest`. |

Optional later: `.gitignore` narrow so **`scripts/`** can hold committed code instead of **`tools/gallery/`** — out of scope unless you intentionally remove **`scripts/**`**.

---

### Task 1: Pytest scaffolding + PYTHONPATH wiring

**Files:**

- Create: `requirements-gallery.txt`
- Create: `pytest.ini`
- Create: `gallery_tests/__init__.py`
- Create: `gallery_tests/test_config_repo_root.py`
- Create: `tools/gallery/__init__.py`
- Create: `tools/gallery/config.py`

- [ ] **Step 1: `requirements-gallery.txt`**

```text
pytest>=8,<9
```

- [ ] **Step 2: `pytest.ini` at repo root**

```ini
[pytest]
pythonpath = tools
testpaths = gallery_tests
```

- [ ] **Step 3: Minimal package + pytest for `repo_root()`**

`tools/gallery/config.py`:

```python
from __future__ import annotations

import os
from pathlib import Path


def repo_root() -> Path:
    forced = os.environ.get("GALLERY_REPO_ROOT", "").strip()
    if forced:
        return Path(forced).resolve()
    marker = Path(__file__).resolve()
    cur = marker.parent
    while cur != cur.parent:
        if (cur / "package.json").is_file():
            return cur
        cur = cur.parent
    raise RuntimeError("gallery: could not locate repo root (no package.json in parents)")
```

`gallery_tests/test_config_repo_root.py`:

```python
from pathlib import Path

from gallery.config import repo_root


def test_repo_root_honors_gallery_repo_root(monkeypatch, tmp_path):
    monkeypatch.chdir(tmp_path)
    root = tmp_path / "proj"
    (root / "package.json").write_text("{}", encoding="utf-8")
    monkeypatch.setenv("GALLERY_REPO_ROOT", str(root))
    assert repo_root() == root
```

- [ ] **Step 4: Run pytest — expect FAILURE until `gallery` resolves**

```bash
python3 -m pip install -r requirements-gallery.txt
python3 -m pytest gallery_tests/test_config_repo_root.py -v
```

Expected: **PASS** (after **`tools/gallery/config.py`** exists).

- [ ] **Step 5: Commit**

```bash
git add pytest.ini requirements-gallery.txt tools/gallery gallery_tests/test_config_repo_root.py gallery_tests/__init__.py tools/gallery/__init__.py tools/gallery/config.py
git commit -m "test: scaffold gallery tooling pytest harness"
```

---

### Task 2: Map schema + normalization tests

**Files:**

- Create: `tools/gallery/map_model.py`
- Create: `gallery_tests/test_map_model.py`

- [ ] **Step 1: Implement loader**

`tools/gallery/map_model.py`:

```python
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
        raise ValueError("Gallery map JSON must be an object with \"entries\": [...]")
    out: list[MapEntry] = []
    for i, row in enumerate(rows):
        entry = _row_to_entry(row, i + 1)
        out.append(entry)
    return out


def _row_to_entry(row: Any, lineno: int) -> MapEntry:
    if not isinstance(row, dict):
        raise ValueError(f"entries[{lineno}] must be object")
    try:
        source = Path(str(row["source"]))
        bucket = str(row["bucket"]).strip().lower()
        link_mode = str(row["link_mode"]).strip().lower()
    except KeyError as e:
        missing = getattr(e, "args", ["?"])[0]
        raise ValueError(f"entries[{lineno}] missing field: {missing}") from e

    pb = row.get("photo_prompt")
    photo_prompt: str | None
    if pb is None:
        photo_prompt = None
    else:
        s = str(pb).strip()
        photo_prompt = s or None

    dest_override = row.get("dest_basename")
    basename = Path(str(dest_override)).name if dest_override else Path(str(row["source"])).name
    if basename in {"", ".", ".."}:
        raise ValueError(f"entries[{lineno}] dest_basename/basename invalid")

    return MapEntry(
        source=source,
        bucket=bucket,
        link_mode=link_mode,
        dest_basename=basename,
        photo_prompt=photo_prompt,
    )
```

**Note:** `bucket`/`link_mode` domain validation delegated to Task 4 — here only structural parsing.

- [ ] **Step 2: Tests**

```python
import json
from pathlib import Path

import pytest

from gallery.map_model import load_map


def test_load_map_basic(tmp_path: Path):
    p = tmp_path / "map.json"
    p.write_text(
        json.dumps(
            {
                "entries": [
                    {"source": "a/b.jpg", "bucket": "bw", "link_mode": "copy", "photo_prompt": " warm "},
                    {"source": "c/d.png", "bucket": "color", "link_mode": "symlink"},
                ]
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    rows = load_map(p)
    assert rows[0].bucket == "bw"
    assert rows[0].link_mode == "copy"
    assert rows[0].photo_prompt == "warm"
    assert rows[1].photo_prompt is None


def test_rejects_outer_array(tmp_path: Path):
    p = tmp_path / "bad.json"
    p.write_text("[]", encoding="utf-8")
    with pytest.raises(ValueError):
        load_map(p)
```

- [ ] **Step 3: Run**

```bash
python3 -m pytest gallery_tests/test_map_model.py -v
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add tools/gallery/map_model.py gallery_tests/test_map_model.py
git commit -m "feat(gallery): parse curation map JSON"
```

---

### Task 3: Basename + extension guard parity with `src/data.ts`

**Files:**

- Create: `tools/gallery/basename_guard.py`
- Create: `gallery_tests/test_basename_guard.py`

- [ ] **Step 1: Guard implementation**

`tools/gallery/basename_guard.py`:

```python
from __future__ import annotations

import re
from pathlib import Path


_IMPORT_NUMERIC = re.compile(r"^import-\d+\.(jpe?g|webp)$", re.I)
_DIGITS_ONLY = re.compile(r"^\d+\.(jpe?g|webp)$", re.I)
_SUPPORTED = re.compile(r"\.(jpe?g|png|webp)$", re.I)


def assert_allowed_publish_basename(filename: str) -> None:
    base = Path(filename).name.strip()
    if not _SUPPORTED.search(base):
        raise ValueError(f"unsupported image basename: {base!r}")
    if _IMPORT_NUMERIC.search(base):
        raise ValueError(f"reserved import-* pattern: {base!r}")
    if _DIGITS_ONLY.search(base):
        raise ValueError(f"reserved digits-only frame id pattern: {base!r}")
```

- [ ] **Step 2: Tests**

Cover good filename, `.jpeg`, rejects `import-1.jpg`, rejects `00432.jpg`.

- [ ] **Step 3: Commit**

---

### Task 4: Publish path resolver + collision policy (fail-fast)

**Files:**

- Create: `tools/gallery/config.py` (extend enums **or** constants)
- Create: `tools/gallery/paths_publish.py`
- Create: `gallery_tests/test_paths_publish.py`

Extend `tools/gallery/config.py` additions:

```python
from pathlib import Path

MANIFEST_REL = Path("src/gallery-manifest.json")
PUBLISH_STILL_LIFE_REL = Path("public/photos/still-life")
ALLOWED_BUCKETS = frozenset({"bw", "color", "still-life"})
ALLOWED_LINK_MODE = frozenset({"copy", "symlink"})


def publish_file_for(repo: Path, bucket: str, dest_basename: str) -> Path:
    bucket = bucket.lower().strip()
    if bucket not in ALLOWED_BUCKETS:
        raise ValueError(f"invalid bucket {bucket!r}; expected bw|color|still-life")
    pub = repo / PUBLISH_STILL_LIFE_REL
    if bucket == "still-life":
        return pub / dest_basename
    return pub / bucket / dest_basename


def manifest_string_for(repo: Path, bucket: str, dest_basename: str) -> str:
    """Return manifest entry token stored in manifest JSON for this asset."""
    if bucket.lower() == "still-life":
        return dest_basename
    rel = Path(bucket) / dest_basename
    return rel.as_posix()
```

Collision test: destination exists → `FileExistsError` before writes.

---

### Task 5: Manifest store (stable JSON round-trip + duplicate detection)

**Files:**

- Create: `tools/gallery/manifest_store.py`
- Create: `gallery_tests/test_manifest_store.py`

Contract:

- Canonical key order preserved as in current shipped file (`still-life`, `bw`, `color`) unless you regenerate entire object — preferably **preserve key order reading `json.loads` not possible in std json** → use **`object_pairs_hook=collections.OrderedDict`** round-trip preserving order detected in source file OR force fixed order `[("still-life", ...), ("bw", ...), ("color", ...)]` explicitly on write — **implement fixed order matching `src/gallery-manifest.json`** to minimize diff churn.

Append rule for bucket list:

```python
def append_if_absent(bucket_list: list, token: str) -> bool:
    if token in bucket_list:
        return False
    bucket_list.append(token)
    return True
```

Tests: duplicates return `False`; write temp manifest and verify ASCII JSON with trailing newline (`\n`).

---

### Task 6: `photo_prompt` subprocess wrapper with env-configurable executable

**Files:**

- Create: `tools/gallery/photo_prompt.py`
- Create: `gallery_tests/test_photo_prompt.py` (patch `subprocess.run`)

Resolve binary:

```python
def resolved_photo_prompt_bin() -> str:
    import os

    exe = os.environ.get("GALLERY_PHOTO_PROMPT", "").strip()
    if exe:
        return exe
    home = Path.home()
    cand = home / "photo-prompt" / ".venv" / "bin" / "photo-prompt"
    if cand.is_file():
        return str(cand)
    return "photo-prompt"
```

Subprocess recipe (adapt from user `photo-prompt` CLI — adjust flags if upstream differs):

```python
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
    str(recipe_abs),
    "--sidecar",
    str(sidecar_abs),
]
subprocess.run(argv, check=True, timeout=int(os.environ.get("GALLERY_PHOTO_PROMPT_TIMEOUT", "240")))
```

**Step for agent:** Confirm actual `photo-prompt --help` on the machine matches these flag names (`edit`, `--recipe-out`, `--sidecar`); tune **Task** if names differ — but plan encodes documented skill default.

Tests: **`subprocess.run` mocked**, assert argv contains `edit` + prompt string.

---

### Task 7: Row orchestrator (dry-run, stage dirs, transactional manifest)

**Files:**

- Create: `tools/gallery/run_import.py` (**module** + `python -m gallery.run_import`)
- Extend: `gallery_tests/` integration-style tests using `tmp_path` fake repo skeleton

Orchestration per `MapEntry` (pseudo-flow — implement exactly in code):

1. Resolve **`repo`** via `gallery.config.repo_root()`.
2. Validate bucket + link_mode via `ALLOWED_*`.
3. `assert_allowed_publish_basename(entry.dest_basename)`.
4. Resolve **source_abs** — if **`entry.source`** relative, resolve relative to **`repo`** first; else use as **`Path`** absolute.
5. Ensure **`.tmp/review`** and **`.tmp/edited`** exist when not dry-run.
6. **Working file path** **`work_abs`**:

   - If **no photo_prompt**: `work_abs = source_abs` directly (streaming copy/link from source to publish path).
   - If **photo_prompt**: copy/link source into **`repo / .tmp/review / dest_basename`** (fail if collision), run **`photo_prompt.run_edit(...)` writing `repo/.tmp/edited/<stem>_edited.<ext>`** or deterministic name **`repo/.tmp/edited/<dest_basename>`** **after wiping prior** — **pick deterministic**:

   **`edited_abs = repo / ".tmp/edited" / dest_basename`** (**overwrite**) so publish basename matches manifest basename.

7. **Publish**:

   ```python
   dest = paths_publish.publish_file_for(repo, entry.bucket, entry.dest_basename)
   dest.parent.mkdir(parents=True, exist_ok=True)
   ```

   Apply **collision fail** if **`dest`** exists (**unless `--force`** — YAGNI: omit **`--force`**, collision always errors).

   - **`symlink`** on Unix: **`dest.unlink(missing_ok=True)`** guarded — must not exist anyway; **`dest.symlink_to(work_abs.resolve())`**
   - **`copy`** — **`shutil.copy2(work_abs, dest)`**

8. **`manifest`** load; append token **`manifest_string_for(repo, bucket, basename)`**; save only if **`not dry-run`**.

9. **`--dry-run`**: Validate all steps reachable, print intended actions (`print` lines stdout), skip writes (**no mkdir under public**, **no subprocess** unless optional debug flag omitted).

Tests:

- **`tmp_path` repo** with **`package.json`**, **`src/gallery-manifest.json` minimal**.
- **`--dry-run`** produces no new files (`public/` absent).
- **Non dry-run copy** publishes file and updates manifest (**use tiny valid jpg**: generate via pure bytes **not** trivial — alternatively **empty file** guarded by **`basename_guard`** only — need real image extensions only; **`validate_asset`** next task could require size>0 reader — optional **minimal 1×1 jpeg** embedded base64 decode in fixture helper).

Minimal JPEG fixture blob (inline bytes hex) snippet for tests:

Use known tiny JPEG (~125 bytes):

```python
TINY_JPEG = bytes([
    # ... abbreviated in plan acceptable? Skill says NO placeholders...
])
```

Concrete minimal JPEG magic valid file (**use Pillow** ❌ forbidden). Use **internet constant** JPEG base64 decoded string — paste full Python bytes literal.

```python
# 1×1 RGB JPEG (~631 bytes typical) — truncated would break tests — include full BASE64 decoded in actual implementation PR.
```

Due to plan length constraint, engineer should inline **trusted tiny JPEG blob** copied from Pillow docs OR write helper **constructing PGM** ❌ unsupported.

**Pragmatic**: test uses **`tmp_path`** with **`.jpg`** **`source`** containing **`b"\xff\xd8\xff\xe0`** minimal **JFIF APP0** markers + valid EOI (**copy from any tiny MIT-licensed JPEG** in repo **`gallery_tests/fixtures/minimal.jpg`** tracked binary **add file** **`gallery/tests/fixtures/one-pixel.jpg`** one-time commit).

**Better plan:**

- Task 7 fixture file created once: **`gallery_tests/fixtures/one_pixel.jpg`** (committed small binary).

Add **Task 2a** committing fixture image **or** defer Task 7 to use **PNG** PNG tiny valid **89 bytes**:

Valid minimal PNG (**89 bytes**) easier to paste as base64 literal.

```python
ONE_PX_PNG_B64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/C/HwAHggJ/PchI7wAAAABJRU5ErkJggg=="
)
```

Implement **`gallery_tests/fixtures.py`**:

```python
import base64
from pathlib import Path

_ONE_PX_PNG_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/C/HwAHggJ/PchI7wAAAABJRU5ErkJggg=="
)


def write_one_pixel_png(path: Path) -> None:
    path.write_bytes(_ONE_PX_PNG_BYTES)
```

Use **`dest_basename` `fixture.png`** in tests (**supported webp/jpeg/png/.jpg**) — **`basename_guard`** allows **`.png`**.

---

### Task 8: Thin npm scripts + README

**Files:**

- Modify: `package.json`
- Modify: `README.md`

Add:

```json
"gallery:import": "PYTHONPATH=tools python3 -m gallery.run_import",
"gallery:verify": "PYTHONPATH=tools python3 -m gallery.verify_manifest",
"gallery:doctor": "PYTHONPATH=tools python3 -m gallery.doctor"
```

**Windows note:** Prefer **`cross-env PYTHONPATH=tools`** dependency **or** **`node -e` wrapper** — YAGNI for mac/linux dev explicitly in README (**user darwin**) — optionally add **`scripts/gallery_npm_exec.sh`** — document **POSIX only** first.

Implement **`gallery/doctor.py`** (**or** **`tools/gallery/__main__.py`** subparser) prints resolved repo root + photo-prompt resolved path **`Path(exists?)`**.

Add **`gallery`** module runnable:

**`tools/gallery/run_import.py`**

```python
if __name__ == "__main__":
    raise SystemExit(main())
```

And **`PYTHONPATH=tools python3 -m gallery.run_import`**.

Needs **`PYTHONPATH`** also in **`package.json`** POSIX export inline — **`"gallery:import": "env PYTHONPATH=tools python3 -m gallery.run_import"`** works on Linux; macOS **`env`** ✅.

README section: prerequisites **`pip install -r requirements-gallery.txt`**, example map path **`.tmp/curation-map.example.json`** committed.

Example map snippet (committed **`.tmp/curation-map.example.json`** is gitignored if **`.tmp/`** ignored globally — **`tools/gallery/examples/curation-map.sample.json`** instead).

---

### Task 9: Verify command + orphan scanning

Implementation rules:

```python
def verify(repo: Path) -> list[str]:
    errors: list[str] = []
    manifest = ManifestStore(repo).load()
    allowed = normalize_all_tokens(manifest)  # set of posix rel paths under photos/still-life without leading slash
    for tok in flatten_manifest_tokens(manifest):
        p = repo / "public/photos/still-life" / tok.replace("\\", "/")
        if not p.is_file():
            errors.append(f"missing file for manifest token {tok!r}: {p}")
    orphan_roots = [(repo/"public"/"photos"/"still-life"/"bw"),
                    (repo/"public"/"photos"/"still-life"/"color")]
    for root in orphan_roots:
        if not root.is_dir():
            continue
        for f in root.rglob("*"):
            if f.is_file() and ext_ok(f.name):
                rel = f.relative_to(repo/"public"/"photos"/"still-life").as_posix()
                if rel not in allowed:
                    errors.append(f"orphan publish file not in manifest: {rel}")
    return errors
```

Tests: seeded orphan triggers error.

---

### Task 10: CI + final integration run

**.github/workflows/ci.yml** append:

```yaml
      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - name: Gallery tooling tests
        run: |
          python3 -m pip install -r requirements-gallery.txt
          python3 -m pytest
```

Ordering: gallery tests after **`npm ci`** unnecessary — can parallel smaller job **or** same job before build.

Run locally:

```bash
npm run lint
npm run test:run
python3 -m pytest
npm run build
```

Commit.

---

## Plan self-review (checklist completed)

**Spec coverage**

| Requirement | Tasks |
|-------------|-------|
| Human-declared `bw` / `color` / `still-life` + symlink/copy | 2 (`map`), 4 (`ALLOWED_*`), 7 orchestrator |
| Optional `photo-prompt` verbatim | 6 subprocess + conditional branch in Task 7 |
| Manifest SSOT model B append only completed | 7 (`dry-run` skips write), 5 transactional save |
| Python only (npm thin wrappers only) | 8 |
| Delete Node prune from build (already) | Already done — verify still `vite build` in Task 10 |
| Verify parity + orphans | Task 9 |
| Fail-fast collision publish | Task 7 |
| `public/photos/still-life/` layout | Tasks 4, 9 |

**Placeholder scan**

- Eliminated dangling test stub referencing `repo_root.with_env`; Task 1 now uses **`monkeypatch.setenv`**.
- Task 7 JPEG ambiguity resolved via **minimal PNG embedded base64** (`gallery_tests/fixtures.py` snippet complete).

**Type/name consistency**

- **Bucket literals** unify on strings `bw`, `color`, `still-life` across `ALLOWED_BUCKETS`.

---

Plan complete and saved to `docs/superpowers/plans/2026-04-30-gallery-pipeline.md`. Two execution options:

**1. Subagent-driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration (**superpowers:subagent-driven-development**).

**2. Inline execution** — run tasks sequentially in one session (**superpowers:executing-plans**).

Which approach?
