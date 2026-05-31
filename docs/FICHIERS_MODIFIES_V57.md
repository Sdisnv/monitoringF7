# Fichiers modifiés — Monitoring F7 v57

## Phase 8 — Préparation backend optionnel futur

### Fichiers créés

- `assets/js/backend-config.js`  
  Configuration centralisée du backend futur, désactivé par défaut.

- `assets/js/api-client.js`  
  Façade API préparatoire : `apiGet`, `apiPost`, `apiPut`, `apiDelete`, `isBackendEnabled`, `getBackendStatus`.

- `assets/js/sync-service.js`  
  Service de synchronisation future avec file locale et statut inactif en v57.

- `docs/FICHIERS_MODIFIES_V57.md`
- `docs/RAPPORT_BACKEND_OPTIONNEL_PHASE_8_V57.md`
- `docs/PROCEDURE_DEPLOIEMENT_V57.md`
- `docs/API_BACKEND_OPTIONNEL_V57.md`

### Fichiers modifiés

- `index.html`  
  Passage v56 → v57, ajout des scripts backend-config/api-client/sync-service avant les services existants.

- `README.md`  
  Passage v57 et ajout de la section Phase 8.

- `assets/js/config.js`  
  Version applicative passée à `v57`.

- `assets/js/auth.js`  
  Ajout de `MonitoringAuthService` sans remplacer la session locale actuelle.

- `assets/js/monitoring-f7-evolution.js`  
  Diagnostic local enrichi avec statut backend, stockage, auth et synchronisation.

- `assets/js/app.js`  
  Version/commentaires mis à jour sans modification des calculs métier.

- `assets/js/audit-log.js`  
  Version/commentaires mis à jour. La clé locale du journal v56 est conservée pour ne pas perdre les journaux existants.

- `assets/js/security.js`
- `assets/js/storage.js`
- `assets/js/data/export-json.js`
- `assets/js/data/import-json.js`
- `assets/js/render/render-charts.js`

### Points explicitement non modifiés

- Aucun calcul métier.
- Aucun KPI.
- Aucun graphique.
- Aucun workflow import/export.
- Aucun backend obligatoire.
- Aucun framework.
- Aucun build.
