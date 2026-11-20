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
