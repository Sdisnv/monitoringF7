# Monitoring F7 v55 — fichiers modifiés

Version livrée : `Monitoring_F7_v55.zip`

## Fichiers applicatifs

- `index.html`
  - passage visible v54 → v55 ;
  - renommage de l’onglet principal en `Dashboard commandement` ;
  - ajout d’un bloc d’introduction commandement ;
  - ajout d’un tableau de comparaison par domaine ;
  - ajout d’un graphique commandement simplifié ;
  - renommage des alertes en `Points de vigilance` ;
  - mise à jour de la mention de version dans les appendices.

- `assets/js/config.js`
  - version applicative `v55`.

- `assets/js/app.js`
  - version interne `v55` ;
  - ajout de `COMMAND_DOMAIN_ORDER` pour le dashboard commandement ;
  - ajout du rendu `renderCommandDashboard()` ;
  - ajout des statuts de lecture rapide par domaine ;
  - alimentation du tableau commandement et du graphique simplifié depuis les calculs existants.

- `assets/css/monitoring-f7-evolution.css`
  - styles du bloc `Dashboard commandement` ;
  - styles du tableau de comparaison ;
  - badges de statut ;
  - responsive laptop/tablette ;
  - CSS print léger.

- `assets/css/base.css`
  - alignement du nom de classe KPI v55.

- `assets/js/auth.js`, `assets/js/storage.js`, `assets/js/security.js`, `assets/js/monitoring-f7-evolution.js`, `assets/js/data/export-json.js`, `assets/js/data/import-json.js`, `assets/js/render/render-charts.js`
  - alignement version visible/interne v55 sans changement de logique fonctionnelle.

- `README.md`
  - ajout de la section Phase 6 v55.

## Documentation ajoutée

- `docs/FICHIERS_MODIFIES_V55.md`
- `docs/RAPPORT_DASHBOARD_COMMANDEMENT_PHASE_6_V55.md`
- `docs/PROCEDURE_DEPLOIEMENT_V55.md`
