# Monitoring F7 v56 — fichiers modifiés

Version livrée : `Monitoring_F7_v56.zip`

## Fichiers ajoutés

- `assets/js/audit-log.js`
  - service de journalisation locale client-only ;
  - fonctions `logInfo`, `logWarning`, `logError`, `logAction`, `getLogs`, `clearLogs`, `exportLogs`, `getLogDiagnostics` ;
  - rotation automatique limitée à 1000 entrées ;
  - export JSON support ;
  - raccordement `window.onerror` et `unhandledrejection`.

- `docs/FICHIERS_MODIFIES_V56.md`
- `docs/RAPPORT_JOURNALISATION_PHASE_7_V56.md`
- `docs/PROCEDURE_DEPLOIEMENT_V56.md`

## Fichiers modifiés

- `index.html`
  - version visible v56 ;
  - chargement de `assets/js/audit-log.js` ;
  - ajout d’une section discrète `Diagnostic local` dans `Gestion Monitoring` ;
  - footer Appendices aligné v56.

- `README.md`
  - version v56 ;
  - procédure de publication actualisée ;
  - ajout de la section Phase 7.

- `assets/js/config.js`
  - version applicative `v56`.

- `assets/js/auth.js`
  - journalisation login local réussi/échoué et logout.

- `assets/js/security.js`
  - raccordement des erreurs globales à la journalisation locale.

- `assets/js/storage.js`
  - journalisation migration stockage et erreurs IndexedDB/StorageService.

- `assets/js/app.js`
  - journalisation imports/exports JSON/CSV ;
  - journalisation génération dashboard ;
  - journalisation erreurs d’initialisation et actions sensibles.

- `assets/js/monitoring-f7-evolution.js`
  - intégration UI Diagnostic local ;
  - export/vidage/rafraîchissement du journal ;
  - diagnostic version, stockage, IndexedDB/localStorage, dernière migration ;
  - journalisation import local, sauvegarde, restauration et suppressions sensibles.

- `assets/js/render/render-charts.js`
  - version v56 ;
  - journalisation légère des avertissements graphiques.

- `assets/css/monitoring-f7-evolution.css`
  - styles minimaux pour le tableau Diagnostic local.

## Non modifié volontairement

- Calculs métier.
- KPI.
- Ordre métier FOBA / PR / DPS / DAP / AUTO / JSP.
- Dashboard commandement v55.
- Import/export existants.
- IndexedDB/localStorage historiques.
- Netlify gratuit / ouverture locale.
