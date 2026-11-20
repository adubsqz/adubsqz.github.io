#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV="${ROOT}/.venv-gallery"

if [[ ! -x "${VENV}/bin/python" ]]; then
  python3 -m venv "${VENV}"
fi

"${VENV}/bin/pip" install -q -r "${ROOT}/requirements-gallery.txt"

cd "${ROOT}"
export PYTHONPATH="${ROOT}/tools"
exec "${VENV}/bin/python" -m "$@"
