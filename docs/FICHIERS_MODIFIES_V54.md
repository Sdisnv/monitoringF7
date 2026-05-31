# Monitoring F7 v54 — fichiers modifiés

## Version

Base stricte : `Monitoring_F7_v53.zip`  
Version livrée : `Monitoring_F7_v54.zip`

## Fichiers modifiés

- `index.html`
  - passage visible v53 → v54 ;
  - hiérarchisation des KPI de synthèse ;
  - ajout des KPI `Excusés` et `Absents non excusés` ;
  - ajout du bloc d’alertes métier non intrusives.

- `README.md`
  - passage v54 ;
  - ajout du résumé Phase 5 ;
  - conservation des notes v50/v51/v52/v53.

- `assets/js/config.js`
  - version applicative `v54`.

- `assets/js/app.js`
  - version interne `v54` ;
  - alimentation des nouveaux KPI de synthèse depuis `summarizeRecords` ;
  - ajout des alertes métier non bloquantes ;
  - conservation des calculs métier existants.

- `assets/js/render/render-charts.js`
  - durcissement complet du rendu graphique ;
  - destruction propre des instances ;
  - gestion canvas absent ;
  - gestion dataset vide ;
  - protections NaN/Infinity/null ;
  - fallback Chart.js indisponible ;
  - messages propres en cas de graphique non exploitable.

- `assets/css/base.css`
  - styles légers pour la grille KPI v54 ;
  - styles du bloc d’alertes métier ;
  - adaptations responsive minimales sans refonte UI.

- `assets/js/auth.js`
- `assets/js/monitoring-f7-evolution.js`
- `assets/js/security.js`
- `assets/js/storage.js`
- `assets/js/data/export-json.js`
- `assets/js/data/import-json.js`
  - alignement version visible/interne v54 sans changement de logique fonctionnelle.

## Fichiers créés

- `docs/FICHIERS_MODIFIES_V54.md`
- `docs/RAPPORT_KPI_GRAPHIQUES_PHASE_5_V54.md`
- `docs/PROCEDURE_DEPLOIEMENT_V54.md`

## Non modifié volontairement

- Aucun backend ajouté.
- Aucun framework ajouté.
- Aucun changement volontaire des règles métier.
- Aucun changement des imports/export JSON/CSV.
- Aucun changement du modèle IndexedDB/localStorage.
- Aucun changement des workflows SDIS.
