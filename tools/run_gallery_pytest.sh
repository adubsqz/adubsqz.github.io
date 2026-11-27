#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV="${ROOT}/.venv-gallery"

if [[ ! -x "${VENV}/bin/python" ]]; then
  if python3 -m venv "${VENV}" 2>/dev/null; then
    :
  elif command -v virtualenv >/dev/null 2>&1; then
    virtualenv -p python3 "${VENV}"
  else
    echo "gallery: need python3-venv or virtualenv to create ${VENV}" >&2
    exit 1
  fi
fi

"${VENV}/bin/pip" install -q -r "${ROOT}/requirements-gallery.txt"

cd "${ROOT}"
export PYTHONPATH="${ROOT}/tools"
exec "${VENV}/bin/pytest" gallery_tests "$@"
