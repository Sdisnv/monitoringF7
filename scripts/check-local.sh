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
grep -q "Monitoring F7 v67.0" index.html
grep -q "version: 'v67.0'" assets/js/config.js
grep -q "Version du fichier : v67.0" index.html

echo "-- Controle Netlify"
grep -q 'functions = "netlify/functions"' netlify.toml
grep -q 'to = "/.netlify/functions/auth-login"' netlify.toml
grep -q 'to = "/.netlify/functions/auth-oidc-start"' netlify.toml
grep -q 'to = "/.netlify/functions/auth-oidc-callback"' netlify.toml
grep -q 'to = "/.netlify/functions/data-records"' netlify.toml
grep -q 'to = "/.netlify/functions/data-objectives"' netlify.toml
grep -q 'to = "/.netlify/functions/data-status"' netlify.toml
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
grep -q "publishLocalCacheToServer" assets/js/app.js
grep -q "SCOPE-IMPL-1A" assets/js/app.js
grep -q "AUTO_PUBLISH_LOCAL: false" assets/js/online-cache-policy.js
grep -q 'from = "/api/scope/*"' netlify.toml
grep -q "ensureScopeSchema" netlify/functions/_scope-schema.js
grep -q "createScopeService" netlify/functions/_scope-service.js
grep -q "listEvenements" netlify/functions/_scope-service.js
grep -q "SCOPE-IMPL-1B" assets/js/scope-ui.js
grep -q "scope-confirm-live" assets/js/scope-ui.js
grep -q "Importer un programme CSV" assets/js/scope-ui.js
grep -q "imports/evenements/preview" netlify/functions/scope.js
grep -q "imports/evenements/commit" netlify/functions/scope.js
grep -qF "require('../../assets/js/scope-csv-import.js')" netlify/functions/_scope-csv-import.js
grep -qF 'included_files = ["assets/js/scope-csv-import.js"]' netlify.scope.toml
grep -q "scope-data-5" netlify/functions/_scope-schema.js
grep -q "scope-data-5-r1" netlify/functions/_scope-schema.js
grep -q "scope-analytics-1" netlify/functions/_scope-schema.js
grep -q "createScopeAnalyticsService" netlify/functions/_scope-analytics-service.js
grep -q "/analytics/summary" netlify/functions/scope.js
grep -q "/analytics/explain" netlify/functions/scope.js
grep -q "/analytics/timeseries" netlify/functions/scope.js
grep -q "mode_suivi" netlify/functions/_scope-schema.js
grep -q "scope-event-q1" netlify/functions/_scope-schema.js
grep -q "scope_saisies_quantitatives" netlify/functions/_scope-schema.js
grep -q "scope_saisies_quantitatives" database/migrations/20260819_scope_event_q1.sql
grep -q "Saisir les présences" assets/js/scope-ui.js
grep -q "saisie-quantitative" netlify/functions/scope.js
grep -q "SAISIE_QUANTITATIVE" netlify/functions/_scope-service.js
grep -q "portee" netlify/functions/_scope-schema.js
grep -q "DATE_BASCULE_SCOPE" assets/js/scope-oi-map.js
grep -q "scope-root" scope.html
grep -q "Vue d’ensemble" assets/js/scope-ui.js
if grep -q "min-width: *980px" assets/css/scope.css; then
  echo "ERREUR: min-width 980px dans scope.css"
  exit 1
fi
grep -q "getDataStatus" assets/js/api-client.js
grep -q "scheduleOnlineCollectionWrite" assets/js/app.js
grep -q "updateAdminCode" assets/js/api-client.js
grep -q "event.httpMethod === 'GET'" netlify/functions/auth-logout.js
grep -q "prompt', 'login'" netlify/functions/_oidc-utils.js
grep -q "DATABASE_URL || process.env.NETLIFY_DATABASE_URL" netlify/functions/_data-store.js
grep -q "data:import" netlify/functions/_rbac.js
grep -q "sdis-chef-formation" netlify/functions/_rbac.js
grep -q "sdis-chef-formation" assets/js/rbac.js
grep -q "PersonnelSDIS" assets/js/admin-users.js
grep -q "assets/data/PersonnelSDIS.csv" assets/js/admin-users.js
grep -q "applyPersonnelFromNip" assets/js/admin-users.js
grep -q "NIP / identifiant" assets/js/admin.js
grep -q "f7-role-choice" assets/js/admin.js
grep -q "assets/data/PersonnelSDIS.csv" assets/js/admin.js
grep -q "effectifUpdatedByNip" index.html
grep -q "personnelSdisNipOptions" index.html
grep -q "effectifUpdateScope" index.html
grep -q "saveReferencePeriodBtn" index.html
grep -q "Effectif concerné" index.html
grep -q "domain-group-title-auto" index.html
grep -q "PERSONNEL_SDIS_CSV_URL" assets/js/app.js
grep -q "applyResponsibleFromNip" assets/js/app.js
grep -q "findPersonnelSdisByDisplayName" assets/js/app.js
grep -q "connectedUserDisplayName" assets/js/app.js
grep -q "REFERENCE_UPDATE_DOMAINS" assets/js/app.js
grep -q "reference-scope-row" assets/css/base.css
grep -q "reference-domain-scope input\\[type=\"checkbox\"\\]" assets/css/base.css
grep -q "summarizeEffectifScope" assets/js/monitoring-f7-evolution.js
grep -q "summarizeEffectifChanges" assets/js/monitoring-f7-evolution.js
grep -q "buildReferenceSnapshotUpToDate" assets/js/app.js
grep -q "recalculateReferencePeriodLifecycle" assets/js/app.js
grep -q "previousIsoDate" assets/js/app.js
grep -q "dateEndByDomain" assets/js/app.js
grep -q "periods.sort((a,b)=>String(a.dateEffective" assets/js/monitoring-f7-evolution.js
grep -q "#de000a" assets/js/render/render-charts.js
grep -q "#171c8f" assets/js/render/render-charts.js
grep -q "#ffa300" assets/js/render/render-charts.js
grep -q "#54585a" assets/js/render/render-charts.js
if grep -q "CB4B40\\|2A2D73\\|DE9043\\|B3B6BE\\|7A7DA8\\|F0C48A" assets/js/render/render-charts.js assets/js/app.js; then
  echo "ERREUR: ancienne palette graphique detectee"
  exit 1
fi
if grep -q "E-mail / sujet Okta" assets/js/admin.js; then
  echo "ERREUR: ancien formulaire utilisateurs detecte dans admin.js"
  exit 1
fi
grep -q "getUserByIdentity" netlify/functions/_user-store.js
grep -q "ensureCoreSchema" netlify/functions/_postgres.js
grep -q "await db.ensureCoreSchema" netlify/functions/_data-store-postgres.js
if grep -q 'delete from' netlify/functions/_data-store-postgres.js; then
  echo "ERREUR: remplacement destructif detecte dans _data-store-postgres.js"
  exit 1
fi

echo "OK: controles locaux termines."
