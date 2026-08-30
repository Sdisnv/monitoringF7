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
if grep -q 'from = "/api/scope/*"' netlify.toml; then
  grep -q 'to = "/scope.html"' netlify.toml
  grep -q 'to = "/.netlify/functions/scope"' netlify.toml
else
  grep -q 'to = "/.netlify/functions/data-records"' netlify.toml
  grep -q 'to = "/.netlify/functions/data-objectives"' netlify.toml
  grep -q 'to = "/.netlify/functions/data-status"' netlify.toml
  grep -q 'to = "/.netlify/functions/admin-settings"' netlify.toml
fi

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
grep -q "Importer un programme d’événements" assets/js/scope-ui.js
grep -q "imports/evenements/preview" netlify/functions/scope.js
grep -q "imports/evenements/commit" netlify/functions/scope.js
grep -qF "require('../../assets/js/scope-csv-import.js')" netlify/functions/_scope-csv-import.js
grep -qF 'assets/js/scope-csv-import.js' netlify.scope.toml
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
grep -q "scope-objectives-1" netlify/functions/_scope-schema.js
grep -q "scope_objectifs" netlify/functions/_scope-schema.js
grep -q "scope_objectifs" database/migrations/20260819_scope_objectives_1.sql
grep -q "resolveObjective" netlify/functions/_scope-objectives.js
grep -q "/objectifs" netlify/functions/scope.js
grep -q "Objectifs de participation" assets/js/scope-ui.js
grep -q "screen: 'objectifs'" assets/js/scope-ui-logic.js
grep -q "#/reglages/objectifs" assets/js/scope-ui.js
grep -q "references:manage" netlify/functions/scope.js
grep -q "portee" netlify/functions/_scope-schema.js
grep -q "DATE_BASCULE_SCOPE" assets/js/scope-oi-map.js
grep -q "scope-root" scope.html
grep -q "Vue d’ensemble" assets/js/scope-ui.js
grep -q "/dashboard" netlify/functions/scope.js
grep -q "createScopeDashboardService" netlify/functions/_scope-dashboard-service.js
grep -q "createScopeAlertsService" netlify/functions/_scope-alerts-service.js
grep -q "/alerts" netlify/functions/scope.js
grep -q "Europe/Zurich" netlify/functions/_scope-calendar.js
grep -q "À traiter" assets/js/scope-ui.js
grep -q "Points de vigilance" assets/js/scope-ui.js
grep -q "classifyInboxItem" netlify/functions/_scope-inbox.js
grep -q "scope_alertes_acquittements" netlify/functions/_scope-schema.js
grep -q "scope_alertes_acquittements" database/migrations/20260820_scope_alerts_1.sql
grep -q "scope-model-2" netlify/functions/_scope-schema.js
grep -q "scope-model-2-r1" netlify/functions/_scope-schema.js
grep -q "scope_personne_periodes" netlify/functions/_scope-schema.js
grep -q "resolveEligiblePopulation" netlify/functions/_scope-service.js
grep -q "ABSENT_DU_FICHIER" assets/js/scope-personnel-sync-contract.js
grep -q "imports/personnel/preview" netlify/functions/scope.js
grep -q "scope_personne_periodes" database/migrations/20260820_scope_model_2_r1.sql
grep -q "scope_suivi_nominatif" netlify/functions/_scope-schema.js
grep -q "PERMUTATION" netlify/functions/_scope-rules.js
grep -q "ACCIDENT_MALADIE" netlify/functions/_scope-model.js
grep -q "scope-import-contract.js" netlify/functions/_scope-import-contract.js
grep -qF 'assets/js/scope-csv-import.js' netlify.scope.toml
grep -qF 'assets/js/scope-personnel-sync-contract.js' netlify.scope.toml
grep -q "previewScopeImport" assets/js/scope-import-contract.js
grep -q "Suivi nominatif" assets/js/scope-ui.js
grep -q "scope-sidebar" assets/js/scope-ui.js
grep -q "scope-select-control" assets/js/scope-ui.js
grep -q "Dont permutations" assets/js/scope-ui.js
grep -q "Comprendre ce chiffre" assets/js/scope-ui.js
grep -q "height: 83px" assets/css/scope.css
grep -q "SCOPE-GRAPH-1" netlify/functions/_scope-graphs.js
grep -q "/analytics/graphs" netlify/functions/scope.js
grep -q "scope-charts.js" scope.html
grep -q -- "--scope-chart-primary" assets/css/scope.css
grep -q "dash.graphs" assets/js/scope-ui.js
grep -q "SCOPE-REPORT-1" netlify/functions/_scope-report-service.js
grep -q "path === '/reports'" netlify/functions/scope.js
grep -q "scope-pdf-viewer.js" scope.html
grep -q "reports:nominatif" netlify/functions/_rbac.js
grep -q "CurrentPermissions" assets/js/rbac.js
grep -qF 'assets/img/logo-scope-blanc.png' netlify.scope.toml
grep -qF 'assets/img/LogoSDISblanc.png' netlify.scope.toml
grep -qF 'assets/img/LogoSDISseulnoir.png' netlify.scope.toml
grep -q "frame-src 'self' blob:" netlify.scope.toml
grep -q '"pdfkit"' package.json
grep -q "SCOPE-PERSONNEL-SYNC-1" netlify/functions/_scope-personnel-sync.js
grep -q "imports/personnel/commit" netlify/functions/scope.js
grep -q "personnel:manage" netlify/functions/_rbac.js
grep -q "personnel:manage" assets/js/scope-ui.js
grep -q "ABSENT_DU_FICHIER" assets/js/scope-personnel-sync-contract.js
grep -q "CHANGEMENT_OI" assets/js/scope-personnel-sync-contract.js
grep -q "scope-sync-preview" assets/js/scope-ui.js
grep -q "scope-personnel-sync-1-tests.js" package.json
grep -q "scope-personnel-sync-1-r1-tests.js" package.json
grep -q "closeAllOpenAffectations" netlify/functions/_scope-personnel.js
grep -q "closeAllOpenAffectations" netlify/functions/_scope-service.js
grep -q "closeAllOpenAffectations" netlify/functions/_scope-personnel-sync.js
grep -q "CLOTURER_AFFECTATION" netlify/functions/_scope-service.js
grep -q "dejaArchive" netlify/functions/_scope-service.js
grep -q "createScopePersonService" netlify/functions/_scope-person-service.js
grep -q "createScopePersonService" netlify/functions/scope.js
grep -q "path === '/personnel'" netlify/functions/scope.js
grep -q "/analytics/persons/:id" netlify/functions/scope.js
grep -q "personnel:read" netlify/functions/_rbac.js
grep -q "personnel:read" assets/js/scope-ui.js
grep -q "directoryRates" netlify/functions/_scope-analytics-service.js
grep -q "screen: 'personne'" assets/js/scope-ui-logic.js
grep -q "#/personnel/" assets/js/scope-ui.js
grep -q "Comprendre ce chiffre" assets/js/scope-ui.js
grep -q "Personne archivée" netlify/functions/_scope-person-service.js
grep -q "scope-person-1-tests.js" package.json
grep -q "SCOPE_EXERCICES_CSV_1" assets/js/scope-import-contract.js
grep -q "IMPORTER_PROGRAMME_EXERCICES" netlify/functions/_scope-service.js
grep -q "scope-event-import-1" netlify/functions/_scope-schema.js
grep -q "IMPORT_CSV" netlify/functions/_scope-schema.js
grep -q "preview_obsolete" netlify/functions/_scope-service.js
grep -qF 'assets/js/scope-import-contract.js' netlify.scope.toml
grep -q "scope-event-import-1-tests.js" package.json
grep -q "scope-qual-finish-1" netlify/functions/_scope-schema.js
grep -q "scope-qual-finish-1-tests.js" package.json
grep -q "Chargement des événements" assets/js/scope-ui-logic.js
grep -q "wantsQualification" netlify/functions/_scope-service.js
grep -q "shouldRenderPermutations" assets/js/scope-ui.js
grep -q "Inclure les données de qualification" assets/js/scope-ui.js
test -f docs/SCOPE_RECETTE_MOA.md
grep -q "SCOPE_Programme_Exercices_Exemple.csv" assets/js/scope-ui.js
grep -q "Programme à importer" assets/js/scope-ui.js
grep -q "SCOPE_EXERCICES_CSV_1" docs/SCOPE_IMPORT_EXERCICES_CSV.md
test -f assets/csv/SCOPE_Programme_Exercices_Exemple.csv
test -f docs/SCOPE_IMPORT_EXERCICES_CSV.md
if grep -q "officialFromQuantitatif" netlify/functions/_scope-pdf-renderer.js; then
  echo "ERREUR: formule KPI dans le renderer PDF"
  exit 1
fi
if grep -q "computeTaux" netlify/functions/_scope-pdf-renderer.js; then
  echo "ERREUR: computeTaux dans le renderer PDF"
  exit 1
fi
if grep -q "officialFromQuantitatif" assets/js/scope-ui.js; then
  echo "ERREUR: calcul officiel dans scope-ui.js"
  exit 1
fi
if grep -q "classifyOperationalAlert" assets/js/scope-ui.js; then
  echo "ERREUR: classification P0 dans scope-ui.js"
  exit 1
fi
if grep -q "ECHU_PLANIFIE" assets/js/scope-ui.js; then
  echo "ERREUR: code P0 parallèle dans scope-ui.js"
  exit 1
fi
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
grep -q "GESTIONNAIRE" netlify/functions/_rbac.js
grep -q "CurrentPermissions" assets/js/rbac.js
grep -q "CSV local utilisateurs" assets/js/admin-users.js
if grep -q "assets/data/PersonnelSDIS.csv" assets/js/admin-users.js assets/js/admin.js assets/js/app.js; then
  echo "ERREUR: dépendance runtime au CSV public PersonnelSDIS.csv"
  exit 1
fi
if grep -q "PERSONNEL_CSV_URL\\|PERSONNEL_SDIS_CSV_URL\\|monitoring_f7_personnel_sdis_csv_v1" assets/js/admin-users.js assets/js/admin.js assets/js/app.js; then
  echo "ERREUR: fallback CSV personnel public ou localStorage legacy"
  exit 1
fi
grep -q "applyPersonnelFromNip" assets/js/admin-users.js
grep -q "NIP / identifiant" assets/js/admin.js
grep -q "f7-role-choice" assets/js/admin.js
grep -q "effectifUpdatedByNip" index.html
grep -q "personnelSdisNipOptions" index.html
grep -q "effectifUpdateScope" index.html
grep -q "saveReferencePeriodBtn" index.html
grep -q "Effectif concerné" index.html
grep -q "domain-group-title-auto" index.html
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
grep -q "scope-personnel-import-populations-1" netlify/functions/_scope-schema.js
grep -q "scope-jsp-grade-model-fix-1" netlify/functions/_scope-schema.js
grep -q "JSP_NORD_VAUDOIS" netlify/functions/_scope-personnel-import-contexts.js
grep -q "MONITEURS_JSP" netlify/functions/_scope-personnel-import-contexts.js
grep -q "classifyJspRole" netlify/functions/_scope-personnel-import-contexts.js
grep -q "AUTO_VL_DPS" netlify/functions/_scope-personnel-import-contexts.js
grep -q "AUTO_VL_DAP" netlify/functions/_scope-personnel-import-contexts.js
grep -q "site_jsp" netlify/functions/_scope-personnel-service.js
grep -q "preview.wrote = false" netlify/functions/_scope-personnel-service.js
grep -q "buildPopulationQuery" netlify/functions/_scope-personnel-service.js
grep -q "a.cible=\$3 or a.cible in ('PL', 'cond PL')" netlify/functions/_scope-personnel-service.js
grep -q "scope-sync-context" assets/js/scope-ui.js
grep -q "scope-sync-site" assets/js/scope-ui.js
grep -q "compactAssignmentLabel" assets/js/scope-personnel-display.js
grep -q "previewDetailRows" assets/js/scope-personnel-display.js
grep -q "evaluateAutoSpecializations" assets/js/scope-personnel-display.js
grep -q "isEffectiveCondVlDps" netlify/functions/_scope-personnel-service.js
grep -q "countsInVlDpsEffectif" netlify/functions/_scope-personnel-service.js
grep -q "scope-auto-specializations-priority.test.js" package.json
grep -q "scope-personnel-display.js" scope.html
grep -q "personnelVisibleRows" assets/js/scope-ui.js
test -f database/migrations/20260823_scope_personnel_import_populations_1.sql
test -f database/migrations/20260823_scope_jsp_grade_model_fix_1.sql
grep -q "drop column if exists niveau" database/migrations/20260823_scope_jsp_grade_model_fix_1.sql
if grep -q "add column if not exists niveau" database/migrations/20260823_scope_personnel_import_populations_1.sql; then
  echo "ERREUR: la migration populations-1 ne doit plus ajouter scope_affectations.niveau"
  exit 1
fi
if grep -E "a\.niveau[^_]|coalesce\(niveau" netlify/functions/_scope-personnel-service.js netlify/functions/_scope-pg.js; then
  echo "ERREUR: une requete production attend encore scope_affectations.niveau"
  exit 1
fi
grep -q "scope-personnel-import-populations.test.js" package.json
grep -q "scope-personnel-import-ux.test.js" package.json
grep -q "scope-personnel-import-ux-order.test.js" package.json
grep -q "scope-jsp-populations.test.js" package.json
grep -q "scope-ds-1-tests.js" package.json
grep -q -- "--scope-radius-xs" assets/css/scope.css
grep -q "scope-segmented" assets/css/scope.css
grep -q "scope-kpi-strip" assets/css/scope.css
grep -q "scope-table-scroll" assets/css/scope.css

echo "OK: controles locaux termines."
