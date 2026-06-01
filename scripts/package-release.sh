#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="/Users/thierrygrunig/Projects/Monitoring F7"
cd "$ROOT_DIR"

VERSION="${1:-v65.4}"
ZIP_NAME="Monitoring_F7_${VERSION}.zip"
OUT_DIR="releases"
OUT_FILE="${OUT_DIR}/${ZIP_NAME}"

echo "== Monitoring F7: packaging ${VERSION} =="

"${ROOT_DIR}/scripts/check-local.sh"
mkdir -p "$OUT_DIR"

if [[ -e "$OUT_FILE" ]]; then
  echo "ERREUR: ${OUT_FILE} existe deja."
  exit 1
fi

zip -r "$OUT_FILE" index.html README.md package.json netlify.toml database assets docs netlify scripts >/dev/null

echo "OK: archive creee: ${OUT_FILE}"
ls -lh "$OUT_FILE"
