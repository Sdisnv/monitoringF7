#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="/Users/thierrygrunig/Projects/Monitoring F7"
cd "$ROOT_DIR"

echo "== Monitoring F7: controles locaux =="

if ! command -v node >/dev/null 2>&1; then
  echo "ERREUR: Node.js est requis pour controler la syntaxe JS."
  exit 1
fi

echo "-- Controle syntaxe JavaScript"
while IFS= read -r file; do
  node --check "$file" >/dev/null
done < <(find assets/js netlify/functions -type f -name '*.js' | sort)

echo "-- Controle version active"
grep -q "Monitoring F7 v65" index.html
grep -q "version: 'v65'" assets/js/config.js
grep -q "Version du fichier : v65" index.html

echo "-- Controle Netlify"
grep -q 'functions = "netlify/functions"' netlify.toml
grep -q 'to = "/.netlify/functions/auth-login"' netlify.toml
grep -q 'to = "/.netlify/functions/data-records"' netlify.toml

echo "-- Controle defaults offline-first"
grep -q "backendEnabled: false" assets/js/backend-config.js
grep -q "syncEnabled: false" assets/js/backend-config.js
grep -q "centralStorageEnabled: false" assets/js/backend-config.js
grep -q "serverAuthEnabled: false" assets/js/backend-config.js

echo "OK: controles locaux termines."
