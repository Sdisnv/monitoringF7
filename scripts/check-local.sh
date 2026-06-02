#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
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
grep -q "Monitoring F7 v66.12" index.html
grep -q "version: 'v66.12'" assets/js/config.js
grep -q "Version du fichier : v66.12" index.html

echo "-- Controle Netlify"
grep -q 'functions = "netlify/functions"' netlify.toml
grep -q 'to = "/.netlify/functions/auth-login"' netlify.toml
grep -q 'to = "/.netlify/functions/auth-oidc-start"' netlify.toml
grep -q 'to = "/.netlify/functions/auth-oidc-callback"' netlify.toml
grep -q 'to = "/.netlify/functions/data-records"' netlify.toml
grep -q 'to = "/.netlify/functions/data-objectives"' netlify.toml
grep -q 'to = "/.netlify/functions/admin-settings"' netlify.toml

echo "-- Controle backend optionnel"
grep -q 'DATABASE_URL' netlify/functions/_postgres.js
grep -q 'OKTA_ISSUER' netlify/functions/_oidc-utils.js
grep -q 'monitoring_f7_records' database/schema.sql
grep -q '"pg"' package.json

echo "-- Controle backend online-first"
grep -q "backendEnabled: true" assets/js/config.js
grep -q "syncEnabled: true" assets/js/config.js
grep -q "centralStorageEnabled: true" assets/js/config.js
grep -q "serverAuthEnabled: true" assets/js/config.js
grep -q "oidcEnabled: true" assets/js/config.js
grep -q "hydrateOnlineDataCache" assets/js/app.js
grep -q "scheduleOnlineCollectionWrite" assets/js/app.js
grep -q "updateAdminCode" assets/js/api-client.js
grep -q "event.httpMethod === 'GET'" netlify/functions/auth-logout.js
if grep -q 'delete from' netlify/functions/_data-store-postgres.js; then
  echo "ERREUR: remplacement destructif detecte dans _data-store-postgres.js"
  exit 1
fi

echo "OK: controles locaux termines."
