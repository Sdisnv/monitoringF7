# Monitoring F7 v52 — Liste détaillée des fichiers modifiés

## Version

Base : `Monitoring_F7_v51.zip`  
Livrable : `Monitoring_F7_v52.zip`

## Fichiers modifiés

- `index.html` : passage visible en v52, cohérence du titre et du footer de version, ordre de chargement des modules conservé.
- `README.md` : ajout de la section Phase 3 / v52 et clarification de la différence entre v51 sécurité et v52 modularisation.
- `assets/js/config.js` : version applicative passée à `v52`.
- `assets/js/app.js` : cœur historique conservé, ajout de la façade `window.MonitoringF7`, délégation progressive vers les modules DOM, dates, nombres, formatage, import JSON et rendu graphiques; réduction prudente du code graphique intégré.
- `assets/js/utils/dom.js` : helpers DOM réellement centralisés (`safeText`, `escapeHTML`, `escapeAttr`, `setText`, `setHTML`, `createElement`).
- `assets/js/utils/numbers.js` : helpers numériques centralisés (`toInt`, `toNumber`, `clamp`, `round1`, `safePercent`).
- `assets/js/utils/dates.js` : helpers dates centralisés (`fmtDate`, `parseFlexibleDateToIso`, `autoFormatDateInput`, etc.).
- `assets/js/utils/formatters.js` : formatage métier centralisé (`percent`, `signedPoints`, `integer`).
- `assets/js/render/render-charts.js` : rendu graphique canvas/Chart.js centralisé avec destruction propre, fallback, données vides et couleurs métier.
- `assets/js/render/render-kpis.js` : façade de rendu KPI compatible avec les anciens appels.
- `assets/js/data/import-json.js` : validation générique d’import JSON extraite et réutilisable.
- `assets/js/data/export-json.js` : helpers génériques d’export JSON.
- `assets/js/calculations/summary.js` : façade de calculs purs simples.
- `assets/js/calculations/series.js` : façade de calculs séries simples.
- `assets/js/auth.js`, `assets/js/security.js`, `assets/js/storage.js`, `assets/js/monitoring-f7-evolution.js`, `netlify.toml` : cohérence de version v52 uniquement, protections v51 conservées.

## Fichiers ajoutés

- `docs/FICHIERS_MODIFIES_V52.md`
- `docs/RAPPORT_MODULARISATION_PHASE_3_V52.md`
- `docs/PROCEDURE_DEPLOIEMENT_V52.md`

## Points volontairement non modifiés

- Pas de framework.
- Pas de backend.
- Pas de migration stockage lourde.
- Pas de modification métier des KPI.
- Pas de refonte UI.
- Pas de changement de structure JSON métier.
